import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  validate,
} from "@/lib/validation";
import type { TeamDocument, TeamMembershipDocument } from "@/types/appwrite";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

// GET /api/teams/members - List members of a team
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    // Check if user is a member of this team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", teamId),
        Query.equal("user_email", auth.email),
        Query.equal("status", "active"),
        Query.limit(1),
      ],
    );

    if (userMembership.documents.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 },
      );
    }

    // Get all members
    const members = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", teamId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );

    return NextResponse.json({
      total: members.total,
      documents: members.documents,
      current_user_role: (
        userMembership.documents[0] as unknown as TeamMembershipDocument
      ).role,
    });
  } catch (error) {
    apiLogger.error(
      "Error fetching team members",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to fetch team members" },
      { status: 500 },
    );
  }
}

// POST /api/teams/members - Invite a new member to the team
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const parsed = validate(inviteTeamMemberSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }
    const { team_id, email, role } = parsed.data;

    // Check if user is owner or admin of the team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", team_id),
        Query.equal("user_email", auth.email),
        Query.equal("status", "active"),
        Query.limit(1),
      ],
    );
    const requesterMembership = userMembership.documents[0] as unknown as
      TeamMembershipDocument | undefined;

    if (
      !requesterMembership ||
      !["owner", "admin"].includes(requesterMembership.role)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to invite members" },
        { status: 403 },
      );
    }

    // Check if team settings allow member invites (for non-owners)
    if (requesterMembership.role !== "owner") {
      const team = (await databases.getDocument(
        config.databaseId,
        config.teamsCollectionId,
        team_id,
      )) as TeamDocument;
      const settings = JSON.parse(team.settings || "{}");
      if (!settings.allow_member_invite) {
        return NextResponse.json(
          { error: "Only the team owner can invite members" },
          { status: 403 },
        );
      }
    }

    // Check if email is already a member
    const existingMember = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", team_id),
        Query.equal("user_email", email.toLowerCase()),
        Query.limit(1),
      ],
    );

    if (existingMember.documents.length > 0) {
      return NextResponse.json(
        { error: "This user is already a member of the team" },
        { status: 400 },
      );
    }

    // Check team settings for require_approval
    const team = (await databases.getDocument(
      config.databaseId,
      config.teamsCollectionId,
      team_id,
    )) as TeamDocument;
    const settings = JSON.parse(team.settings || "{}");

    // If require_approval is false, add directly as active member
    // Otherwise, create as pending member
    const memberStatus = settings.require_approval ? "pending" : "active";
    const now_time = new Date().toISOString();

    const member = await databases.createDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      ID.unique(),
      {
        team_id,
        user_email: email.toLowerCase(),
        role,
        permissions: JSON.stringify([]),
        invited_by: auth.email,
        joined_at: memberStatus === "active" ? now_time : null,
        status: memberStatus,
      },
    );

    return NextResponse.json({
      ...member,
      message:
        memberStatus === "pending"
          ? "Invitation sent. User needs to accept the invite."
          : "Member added successfully.",
    });
  } catch (error) {
    apiLogger.error(
      "Error inviting team member",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to invite team member" },
      { status: 500 },
    );
  }
}

// PUT /api/teams/members - Update a member's role
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const parsed = validate(updateTeamMemberSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }
    const { member_id, role, status } = parsed.data;

    // Get the member document
    const member = (await databases.getDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      member_id,
    )) as TeamMembershipDocument;

    // Check if user is owner or admin of the team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", member.team_id),
        Query.equal("user_email", auth.email),
        Query.equal("status", "active"),
        Query.limit(1),
      ],
    );
    const requesterMembership = userMembership.documents[0] as unknown as
      TeamMembershipDocument | undefined;

    if (
      !requesterMembership ||
      !["owner", "admin"].includes(requesterMembership.role)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to update members" },
        { status: 403 },
      );
    }

    // Prevent changing owner role
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 },
      );
    }

    // Admins can't change other admins
    if (requesterMembership.role === "admin" && member.role === "admin") {
      return NextResponse.json(
        { error: "Admins cannot modify other admins" },
        { status: 403 },
      );
    }

    const updateData: Partial<TeamMembershipDocument> = {};

    if (role) {
      updateData.role = role;
    }

    if (status) {
      updateData.status = status;
    }

    const updated = await databases.updateDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      member_id,
      updateData,
    );

    // Log the action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: auth.email,
            action: "team.member_role_change",
            resource_type: "team",
            resource_id: member.team_id,
            details: JSON.stringify({
              member_email: member.user_email,
              old_role: member.role,
              new_role: role || member.role,
            }),
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
            user_agent: request.headers.get("user-agent") || "unknown",
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        apiLogger.warn("Failed to log role change", { error: e });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    apiLogger.error(
      "Error updating team member",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to update team member" },
      { status: 500 },
    );
  }
}

// DELETE /api/teams/members - Remove a member from the team
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // Get the member document
    const member = (await databases.getDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      memberId,
    )) as TeamMembershipDocument;

    // Check permissions
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal("team_id", member.team_id),
        Query.equal("user_email", auth.email),
        Query.equal("status", "active"),
        Query.limit(1),
      ],
    );

    const userRole: string | null =
      userMembership.documents.length > 0
        ? (userMembership.documents[0] as unknown as TeamMembershipDocument)
            .role
        : null;

    // Allow self-removal (leaving the team) or admin/owner removal
    const isSelfRemoval = member.user_email === auth.email;
    const canRemoveOthers = userRole
      ? ["owner", "admin"].includes(userRole)
      : false;

    if (!isSelfRemoval && !canRemoveOthers) {
      return NextResponse.json(
        { error: "You don't have permission to remove members" },
        { status: 403 },
      );
    }

    // Prevent owner from being removed
    if (member.role === "owner") {
      return NextResponse.json(
        {
          error: "The team owner cannot be removed. Transfer ownership first.",
        },
        { status: 400 },
      );
    }

    // Admins can't remove other admins
    if (userRole === "admin" && member.role === "admin" && !isSelfRemoval) {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 },
      );
    }

    await databases.deleteDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      memberId,
    );

    // Log the action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: auth.email,
            action: "team.member_remove",
            resource_type: "team",
            resource_id: member.team_id,
            details: JSON.stringify({
              removed_email: member.user_email,
              self_removal: isSelfRemoval,
            }),
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
            user_agent: request.headers.get("user-agent") || "unknown",
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        apiLogger.warn("Failed to log member removal", { error: e });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error(
      "Error removing team member",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to remove team member" },
      { status: 500 },
    );
  }
}
