import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GROUP_COLORS } from "@/lib/contacts/groups";

export interface NewGroupState {
  name: string;
  description: string;
  color: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newGroup: NewGroupState;
  setNewGroup: (value: NewGroupState) => void;
  isLoading: boolean;
  onCreateGroup: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  newGroup,
  setNewGroup,
  isLoading,
  onCreateGroup,
}: CreateGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>Organize your contacts into groups</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="new-group-name" className="text-sm font-medium">
              Group Name *
            </label>
            <Input
              id="new-group-name"
              placeholder="e.g., VIP Clients"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Optional description..."
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                  className={`w-8 h-8 rounded-full ${color.class} ${
                    newGroup.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  title={color.label}
                  aria-label={color.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onCreateGroup}
              disabled={isLoading || !newGroup.name.trim()}
              className="flex-1"
            >
              Create Group
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
