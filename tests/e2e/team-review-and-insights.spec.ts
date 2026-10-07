import { expect, test } from "@playwright/test";

const reviewId = "878f5034-e464-4df0-b38e-cecebc572e80";

test("reviewer inspects a frozen personalized sample and approves with a comment", async ({
  page,
}) => {
  let status = "pending";
  let decision: Record<string, unknown> | undefined;
  const review = {
    id: reviewId,
    team_id: "team",
    submitter_email: "sender@example.com",
    status,
    snapshot: {
      subject: "Hello {{name}}",
      content: "<p>Hello {{name}}</p>",
      recipients: ["ada@example.com"],
      csv_data: [{ email: "ada@example.com", name: "Ada" }],
      attachments: [],
      send_now: true,
      scheduled_at: new Date().toISOString(),
    },
  };
  await page.route("**/api/teams", (route) =>
    route.fulfill({
      json: { documents: [{ $id: "team", name: "Design team", user_role: "admin" }] },
    }),
  );
  await page.route("**/api/campaign-reviews**", (route) => {
    if (route.request().method() === "PUT") {
      decision = route.request().postDataJSON();
      status = "approved";
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({
      json: route.request().url().includes("?id=")
        ? { review: { ...review, status }, role: "admin", comments: [] }
        : { documents: [{ ...review, subject: "Hello {{name}}", status }], role: "admin" },
    });
  });
  await page.goto("/reviews");
  await page.getByLabel("Review team", { exact: true }).click();
  await page.getByRole("option", { name: "Design team" }).click();
  await page.getByRole("button", { name: "Inspect campaign" }).click();
  await expect(
    page
      .frameLocator('iframe[title="Reviewed email sample"]')
      .getByText("Hello Ada", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Review comment").fill("Audience and attachment references checked.");
  await page.getByRole("button", { name: "Approve campaign" }).click();
  await expect(page.getByText("Review updated")).toBeVisible();
  expect(decision).toEqual({
    id: reviewId,
    action: "approved",
    comment: "Audience and attachment references checked.",
  });
});

test("sender requests review, cannot dispatch pending or changed content, then queues a fresh approval", async ({
  page,
}) => {
  let approved = false;
  let reviewedSubject = "";
  let accepted = 0;
  await page.route("**/api/teams", (route) =>
    route.fulfill({
      json: { documents: [{ $id: "team", name: "Design team", user_role: "member" }] },
    }),
  );
  await page.route("**/api/campaign-preflight", (route) =>
    route.fulfill({
      json: { recipients: ["ada@example.com"], duplicates: 0, suppressed: [], issues: [] },
    }),
  );
  await page.route("**/api/campaign-reviews**", (route) => {
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      expect(input.team_id).toBe("team");
      expect(input.snapshot.csv_data[0].name).toBe("Ada");
      reviewedSubject = input.snapshot.subject;
      return route.fulfill({ status: 201, json: { id: reviewId, status: "pending" } });
    }
    approved = true;
    return route.fulfill({ json: { review: { status: "approved" } } });
  });
  await page.route("**/api/scheduled-campaigns", (route) => {
    if (route.request().method() !== "POST") {
      return route.fulfill({ json: { documents: [], total: 0 } });
    }
    const input = route.request().postDataJSON();
    expect(input.team_id).toBe("team");
    expect(input.review_id).toBe(reviewId);
    if (!approved || input.subject !== reviewedSubject) {
      return route.fulfill({
        status: 412,
        json: { error: "Approval pending or campaign changed. Request a new review." },
      });
    }
    accepted++;
    return route.fulfill({ status: 201, json: { $id: "job", ...input } });
  });
  await page.route("**/api/campaign-recovery", (route) =>
    route.fulfill({
      json: { configured: true, offlineReady: true, last_tick: new Date().toISOString() },
    }),
  );
  await page.goto("/compose");
  await page.getByLabel("Email *", { exact: true }).fill("ada@example.com");
  await page.getByLabel("Name (optional)").fill("Ada");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "2 Compose", exact: true }).click();
  await page.locator("#subject").fill("Hello {{name}}");
  await page.locator('[contenteditable="true"]').fill("Message {{name}}");
  await page.getByRole("button", { name: "3 Preview", exact: true }).click();
  await page.getByLabel("Campaign workspace", { exact: true }).click();
  await page.getByRole("option", { name: "Design team" }).click();
  await page.getByRole("button", { name: "Request team review" }).click();
  await expect(page.getByRole("link", { name: "View review" })).toBeVisible();
  await page.getByRole("button", { name: "Send now", exact: true }).click();
  await expect(
    page.getByText("Approval pending or campaign changed. Request a new review."),
  ).toBeVisible();
  expect(accepted).toBe(0);
  await page.getByRole("button", { name: "Refresh approval status" }).click();
  await page.getByRole("button", { name: "2 Compose", exact: true }).click();
  await page.locator("#subject").fill("Changed subject");
  await page.getByRole("button", { name: "3 Preview", exact: true }).click();
  await page.getByRole("button", { name: "Send now", exact: true }).click();
  expect(accepted).toBe(0);
  await page.getByRole("button", { name: "Request team review" }).click();
  await expect.poll(() => reviewedSubject).toBe("Changed subject");
  await page.getByRole("button", { name: "Send now", exact: true }).click();
  await expect(page).toHaveURL(/\/scheduled/);
  expect(accepted).toBe(1);
});

test("analytics explains acceptance and reports unavailable tracking instead of zero engagement", async ({
  page,
}) => {
  const campaign = {
    $id: "campaign",
    subject: "Update",
    content: "Message",
    recipients: ["reader@example.com"],
    sent: 1,
    failed: 0,
    status: "completed",
    created_at: new Date().toISOString(),
  };
  await page.route("**/api/appwrite/campaigns**", (route) =>
    route.fulfill({ json: { documents: [campaign] } }),
  );
  await page.route("**/api/activity/events**", (route) =>
    route.fulfill({ status: 503, json: { error: "Tracking unavailable" } }),
  );
  await page.goto("/insights");
  const definitions = page.getByRole("region", { name: "Metric definitions" });
  await definitions.getByText("What these metrics measure").click();
  await expect(definitions.getByText(/Sent means Gmail accepted the request/)).toBeVisible();
  await expect(definitions.getByText(/Tracking data is unavailable/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Performance", exact: true })).toBeDisabled();
  await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
});
