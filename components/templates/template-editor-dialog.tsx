import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailTemplate } from "@/lib/appwrite";

interface TemplateCategory {
  value: string;
  label: string;
}

interface TemplateEditorDialogProps {
  open: boolean;
  isLoading: boolean;
  editingTemplate: EmailTemplate | null;
  categories: TemplateCategory[];
  saveVersion: boolean;
  changeNote: string;
  onOpenChange: (open: boolean) => void;
  onEditingTemplateChange: (template: EmailTemplate | null) => void;
  onSaveVersionChange: (value: boolean) => void;
  onChangeNoteChange: (value: string) => void;
  onUpdateTemplate: () => void;
  onCancel: () => void;
}

export function TemplateEditorDialog({
  open,
  isLoading,
  editingTemplate,
  categories,
  saveVersion,
  changeNote,
  onOpenChange,
  onEditingTemplateChange,
  onSaveVersionChange,
  onChangeNoteChange,
  onUpdateTemplate,
  onCancel,
}: TemplateEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>Update your email template</DialogDescription>
        </DialogHeader>
        {editingTemplate && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={editingTemplate.name}
                  onChange={(e) =>
                    onEditingTemplateChange({
                      ...editingTemplate,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={editingTemplate.category || "other"}
                  onChange={(e) =>
                    onEditingTemplateChange({
                      ...editingTemplate,
                      category: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Email Subject *</Label>
              <Input
                id="email-subject"
                value={editingTemplate.subject}
                onChange={(e) =>
                  onEditingTemplateChange({
                    ...editingTemplate,
                    subject: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email Content</Label>
              <RichTextEditor
                content={editingTemplate.content}
                onChange={(content) => onEditingTemplateChange({ ...editingTemplate, content })}
              />
            </div>
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="saveVersion"
                  checked={saveVersion}
                  onChange={(e) => onSaveVersionChange(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="saveVersion" className="text-sm font-normal cursor-pointer">
                  Save current version before updating (allows restoring later)
                </Label>
              </div>
              {saveVersion && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="changeNote" className="text-sm">
                    Change note (optional)
                  </Label>
                  <Input
                    id="changeNote"
                    placeholder="e.g., Updated header styling"
                    value={changeNote}
                    onChange={(e) => onChangeNoteChange(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={onUpdateTemplate}
                disabled={
                  isLoading || !editingTemplate.name.trim() || !editingTemplate.subject.trim()
                }
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
