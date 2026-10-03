import { Plus } from "lucide-react";

import { RichTextEditor } from "@/components/rich-text-editor";
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
import { Label } from "@/components/ui/label";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/default-templates";

export interface NewTemplateState {
  name: string;
  subject: string;
  content: string;
  category: string;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTemplate: NewTemplateState;
  setNewTemplate: (value: NewTemplateState) => void;
  isLoading: boolean;
  onCreateTemplate: () => void;
  onCancel: () => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  newTemplate,
  setNewTemplate,
  isLoading,
  onCreateTemplate,
  onCancel,
}: CreateTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>Create a reusable email template for your campaigns</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Email"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    category: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              placeholder="Enter email subject line..."
              value={newTemplate.subject}
              onChange={(e) =>
                setNewTemplate({
                  ...newTemplate,
                  subject: e.target.value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{name}}"}, {"{{email}}"}, etc. for personalization
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email Content</Label>
            <RichTextEditor
              content={newTemplate.content}
              onChange={(content) => setNewTemplate({ ...newTemplate, content })}
              placeholder="Compose your template content..."
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onCreateTemplate}
              disabled={isLoading || !newTemplate.name.trim() || !newTemplate.subject.trim()}
              className="flex-1"
            >
              Create Template
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
