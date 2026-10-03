import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAuthed, requireSession } from "@/lib/api-auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { databases, config } from "@/lib/appwrite-server";
import { selectAudience, type AudienceFilters } from "@/lib/contacts/audiences";
import { listOwnedContacts } from "@/lib/services/contact-directory";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  filters: z.object({
    tag: z.string().trim().max(100).optional(),
    company: z.string().trim().max(200).optional(),
    group_id: z.string().max(100).optional(),
  }),
});
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Saved audiences require the database migration" },
      { status: 503 },
    );
  }
  try {
    const id = request.nextUrl.searchParams.get("id");
    const result = await dbQuery(
      "SELECT id, name, filters FROM saved_audiences WHERE user_email = $1 AND ($2::uuid IS NULL OR id = $2::uuid) ORDER BY created_at DESC LIMIT 100",
      [auth.email, id],
    );
    if (!id) {
      return NextResponse.json({ documents: result.rows });
    }
    const audience = result.rows[0];
    if (!audience) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const filters = audience.filters as AudienceFilters;
    let groupIds: string[] | undefined;
    if (filters.group_id) {
      const group = await databases.getDocument(
        config.databaseId,
        config.contactGroupsCollectionId,
        filters.group_id,
      );
      if (group.user_email !== auth.email) {
        return NextResponse.json({ error: "Audience group no longer available" }, { status: 404 });
      }
      groupIds =
        typeof group.contact_ids === "string" ? JSON.parse(group.contact_ids) : group.contact_ids;
    }
    const rows = selectAudience(await listOwnedContacts(auth.email), filters, groupIds);
    if (rows.length > 1000) {
      return NextResponse.json(
        { error: "Audience exceeds the 1,000 recipient campaign limit. Narrow the filters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ...audience, rows });
  } catch {
    return NextResponse.json({ error: "Unable to load saved audience" }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const data = schema.safeParse(await request.json());
    if (!data.success) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    if (data.data.filters.group_id) {
      const group = await databases.getDocument(
        config.databaseId,
        config.contactGroupsCollectionId,
        data.data.filters.group_id,
      );
      if (group.user_email !== auth.email) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    const result = await dbQuery(
      "INSERT INTO saved_audiences(id,user_email,name,filters) VALUES ($1,$2,$3,$4::jsonb) RETURNING id,name,filters",
      [randomUUID(), auth.email, data.data.name, JSON.stringify(data.data.filters)],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to save audience. Check database configuration." },
      { status: 503 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const id = request.nextUrl.searchParams.get("id");
    const result = await dbQuery(
      "DELETE FROM saved_audiences WHERE id = $1 AND user_email = $2 RETURNING id",
      [id, auth.email],
    );
    return NextResponse.json(result.rowCount ? { success: true } : { error: "Not found" }, {
      status: result.rowCount ? 200 : 404,
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete audience" }, { status: 503 });
  }
}
