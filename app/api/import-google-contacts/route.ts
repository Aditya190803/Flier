import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { apiLogger } from "@/lib/logger";

interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: Array<{
    displayName?: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
}

interface GoogleContactsResponse {
  connections?: GoogleContact[];
  nextPageToken?: string;
  totalItems?: number;
  totalPeople?: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request, { accessToken: true });
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken");
    const pageSize = searchParams.get("pageSize") || "100";

    // Build the Google People API URL
    const apiUrl = new URL("https://people.googleapis.com/v1/people/me/connections");
    apiUrl.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations");
    apiUrl.searchParams.set("pageSize", pageSize);
    if (pageToken) {
      apiUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      apiLogger.error("Google People API error", undefined, errorData);

      if (response.status === 403) {
        return NextResponse.json(
          {
            error: "Permission denied. Please sign out and sign in again to grant contacts access.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        {
          error: errorData.error?.message || "Failed to fetch Google contacts",
        },
        { status: response.status },
      );
    }

    const data: GoogleContactsResponse = await response.json();

    // Transform the contacts to our format
    const contacts = (data.connections || [])
      .filter((contact) => contact.emailAddresses && contact.emailAddresses.length > 0)
      .map((contact) => ({
        name:
          contact.names?.[0]?.displayName ||
          (contact.names?.[0]?.givenName && contact.names?.[0]?.familyName
            ? `${contact.names[0].givenName} ${contact.names[0].familyName}`
            : contact.names?.[0]?.givenName || ""),
        email: contact.emailAddresses![0].value,
        phone: contact.phoneNumbers?.[0]?.value || "",
        company: contact.organizations?.[0]?.name || "",
        googleResourceName: contact.resourceName,
      }));

    return NextResponse.json({
      contacts,
      nextPageToken: data.nextPageToken,
      totalItems: data.totalPeople || data.totalItems || contacts.length,
    });
  } catch (error) {
    apiLogger.error("Error fetching Google contacts", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
