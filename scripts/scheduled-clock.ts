import { config as loadEnv } from "dotenv";

import { closeDatabase } from "../lib/db";

loadEnv({ path: ".env.local", quiet: true });

const configuredInterval = Number(
  process.env.SCHEDULED_CLOCK_INTERVAL_MS || 60_000,
);
const intervalMs = Number.isFinite(configuredInterval)
  ? Math.max(15_000, configuredInterval)
  : 60_000;
let stopping = false;
let wake: (() => void) | undefined;

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    stopping = true;
    wake?.();
  });
}

function wait(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, intervalMs);
    wake = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

async function main(): Promise<void> {
  const { runScheduledCampaignPass } =
    await import("../lib/services/scheduled-campaign-worker");

  try {
    while (!stopping) {
      try {
        const result = await runScheduledCampaignPass();
        console.log(
          JSON.stringify({ event: "scheduled_campaign_pass", ...result }),
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "scheduled_campaign_pass_failed",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }

      if (!stopping) {
        await wait();
      }
    }
  } finally {
    await closeDatabase();
  }
}

void main();
