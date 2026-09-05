"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";

interface Team {
  $id: string;
  name: string;
  description?: string;
  owner_email: string;
  created_at: string;
  user_role: "owner" | "admin" | "member" | "viewer";
  settings?: {
    allow_member_invite: boolean;
    require_approval: boolean;
    shared_templates: boolean;
    shared_contacts: boolean;
  };
}

interface TeamMember {
  $id: string;
  team_id: string;
  user_email: string;
  role: "owner" | "admin" | "member" | "viewer";
  permissions?: string[];
  invited_by?: string;
  joined_at?: string;
  status: "pending" | "active" | "removed";
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors = {
  owner: "warning",
  admin: "secondary",
  member: "default",
  viewer: "outline",
};

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });

  // Team details state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", role: "member" });
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();
      setTeams(data.documents || []);
    } catch (error) {
      componentLogger.error(
        "Failed to fetch teams",
        error instanceof Error ? error : undefined,
      );
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      fetchTeams();
    }
  }, [session?.user?.email, fetchTeams]);

  const fetchTeamMembers = async (teamId: string) => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/teams/members?team_id=${teamId}`);
      const data = await response.json();
      setTeamMembers(data.documents || []);
    } catch (error) {
      componentLogger.error(
        "Failed to fetch team members",
        error instanceof Error ? error : undefined,
      );
      setTeamMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    fetchTeamMembers(team.$id);
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    setIsCreating(true);
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify(newTeam),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create team");
      }

      const team = await response.json();
      setTeams((prev) => [team, ...prev]);
      setCreateDialogOpen(false);
      setNewTeam({ name: "", description: "" });
      toast.success("Team created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteData.email.trim() || !selectedTeam) {
      toast.error("Email is required");
      return;
    }

    setIsInviting(true);
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/teams/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({
          team_id: selectedTeam.$id,
          email: inviteData.email,
          role: inviteData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite member");
      }

      await fetchTeamMembers(selectedTeam.$id);
      setInviteDialogOpen(false);
      setInviteData({ email: "", role: "member" });
      toast.success("Member invited successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) {
      return;
    }

    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch(`/api/teams/members?id=${memberId}`, {
        method: "DELETE",
        headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      setTeamMembers((prev) => prev.filter((m) => m.$id !== memberId));
      toast.success("Member removed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: "DELETE",
        headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete team");
      }

      setTeams((prev) => prev.filter((t) => t.$id !== teamId));
      if (selectedTeam?.$id === teamId) {
        setSelectedTeam(null);
        setTeamMembers([]);
      }
      toast.success("Team deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team");
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/teams/members", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.$id === memberId ? { ...m, role: newRole as any } : m,
        ),
      );
      toast.success("Role updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            Teams
          </div>
        }
        description="Collaborate with your team on email campaigns"
      />

      <div className="flex justify-end mb-8">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with others on email campaigns.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeam.name}
                  onChange={(e) =>
                    setNewTeam((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Marketing Team"
                />
              </div>
              <div>
                <Label htmlFor="team-description">Description (optional)</Label>
                <Input
                  id="team-description"
                  value={newTeam.description}
                  onChange={(e) =>
                    setNewTeam((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Team for marketing email campaigns"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-4">
          {teams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a team to start collaborating
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            teams.map((team) => {
              const RoleIcon = roleIcons[team.user_role];
              return (
                <Card
                  key={team.$id}
                  className={`cursor-pointer transition-all ${
                    selectedTeam?.$id === team.$id
                      ? "border-primary shadow-md"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectTeam(team)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{team.name}</h3>
                      <Badge
                        variant={roleColors[team.user_role] as any}
                        className="gap-1"
                      >
                        <RoleIcon className="h-3 w-3" />
                        {team.user_role}
                      </Badge>
                    </div>
                    {team.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {team.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(team.created_at), "MMM d, yyyy")}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTeam.name}</CardTitle>
                    {selectedTeam.description && (
                      <CardDescription>
                        {selectedTeam.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {["owner", "admin"].includes(selectedTeam.user_role) && (
                      <Dialog
                        open={inviteDialogOpen}
                        onOpenChange={setInviteDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Member</DialogTitle>
                            <DialogDescription>
                              Invite someone to join {selectedTeam.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="invite-email">
                                Email Address
                              </Label>
                              <Input
                                id="invite-email"
                                type="email"
                                value={inviteData.email}
                                onChange={(e) =>
                                  setInviteData((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                placeholder="colleague@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="invite-role">Role</Label>
                              <Select
                                value={inviteData.role}
                                onValueChange={(value: string) =>
                                  setInviteData((prev) => ({
                                    ...prev,
                                    role: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    Admin - Can manage members and settings
                                  </SelectItem>
                                  <SelectItem value="member">
                                    Member - Can create and send campaigns
                                  </SelectItem>
                                  <SelectItem value="viewer">
                                    Viewer - Can only view data
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setInviteDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleInviteMember}
                              disabled={isInviting}
                            >
                              {isInviting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Inviting...
                                </>
                              ) : (
                                "Send Invite"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {selectedTeam.user_role === "owner" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Team</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "
                              {selectedTeam.name}"? This will remove all members
                              and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTeam(selectedTeam.$id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-4">Members</h4>

                {isLoadingMembers ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No members found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const RoleIcon = roleIcons[member.role];
                      const isCurrentUser =
                        member.user_email === session?.user?.email;
                      const canManage =
                        ["owner", "admin"].includes(selectedTeam.user_role) &&
                        !isCurrentUser;

                      return (
                        <div
                          key={member.$id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {member.user_email}
                                </span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge
                                  variant={roleColors[member.role] as any}
                                  className="gap-1"
                                >
                                  <RoleIcon className="h-3 w-3" />
                                  {member.role}
                                </Badge>
                                {member.status === "pending" && (
                                  <Badge variant="warning">Pending</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {canManage && member.role !== "owner" && (
                            <div className="flex items-center gap-2">
                              <Select
                                value={member.role}
                                onValueChange={(value: string) =>
                                  handleUpdateMemberRole(member.$id, value)
                                }
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Remove Member
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove {member.user_email} from the team?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleRemoveMember(member.$id)
                                      }
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a team</h3>
                <p className="text-muted-foreground">
                  Click on a team from the list to view details and manage
                  members
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
