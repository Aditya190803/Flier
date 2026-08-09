/**
 * Shared `?id=` handling for collection GET routes.
 *
 * The client CRUD factory (`createCrudService`) fetches one document with
 * `GET /api/appwrite/<collection>?id=<id>`. The collection routes are
 * single-file handlers with no `[id]` segment, so this is the only form that
 * can work — and each route needs the same ownership check before returning
 * anything.
 *
 * @module appwrite/single-document
 */

import { NextResponse, type NextRequest } from "next/server";

import { databases, config } from "@/lib/appwrite-server";

/**
 * Serve the single-document form of a collection GET.
 *
 * @param map - Shapes the document the same way the route's list path does,
 *   so callers get one consistent representation.
 * @returns A response when `?id=` was present, or `null` to let the route
 *   fall through to its list path.
 */
export async function respondWithOwnedDocument(
  request: NextRequest,
  collectionId: string,
  userEmail: string,
  map: (doc: Record<string, any>) => unknown = (doc) => doc,
): Promise<NextResponse | null> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return null;
  }

  let doc: Record<string, any>;
  try {
    doc = (await databases.getDocument(
      config.databaseId,
      collectionId,
      id,
    )) as unknown as Record<string, any>;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Never leak another user's document, even to an authenticated caller.
  if (doc.user_email !== userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(map(doc));
}
