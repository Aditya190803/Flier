import { FileText, Pen, RefreshCw, Sparkles } from "lucide-react";

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
import type { EmailTemplate } from "@/lib/appwrite";

interface QuickStartTemplate {
  name: string;
  icon: string;
  subject: string;
  content: string;
}

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplate[];
  templateSearch: string;
  onTemplateSearchChange: (value: string) => void;
  isLoadingTemplates: boolean;
  onApplyTemplate: (template: EmailTemplate) => void;
  onBrowseAllTemplates: () => void;
  onLoadTemplates: () => void;
}

const quickStartTemplates: QuickStartTemplate[] = [
  {
    name: "Welcome",
    icon: "👋",
    subject: "Welcome, {{name}}!",
    content:
      "<p>Hi {{name}},</p><p>Welcome aboard! We're excited to have you.</p><p>Best regards</p>",
  },
  {
    name: "Thank You",
    icon: "🙏",
    subject: "Thank you, {{name}}!",
    content: "<p>Dear {{name}},</p><p>Thank you so much for your support!</p><p>Warm regards</p>",
  },
  {
    name: "Meeting",
    icon: "📅",
    subject: "Meeting Request: {{topic}}",
    content:
      "<p>Hi {{name}},</p><p>I'd like to schedule a meeting to discuss {{topic}}.</p><p>Would any of these times work for you?</p><p>Best</p>",
  },
  {
    name: "Follow-up",
    icon: "🔄",
    subject: "Following up: {{topic}}",
    content:
      "<p>Hi {{name}},</p><p>I wanted to follow up on {{topic}}.</p><p>Have you had a chance to think about it?</p><p>Best</p>",
  },
  {
    name: "Reminder",
    icon: "⏰",
    subject: "Reminder: {{event}}",
    content:
      "<p>Hi {{name}},</p><p>This is a friendly reminder about {{event}}.</p><p>See you soon!</p>",
  },
  {
    name: "Invitation",
    icon: "🎉",
    subject: "You're Invited: {{event}}",
    content:
      "<p>Dear {{name}},</p><p>You're invited to {{event}}!</p><p>We hope to see you there.</p><p>Best regards</p>",
  },
];

export function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  templateSearch,
  onTemplateSearchChange,
  isLoadingTemplates,
  onApplyTemplate,
  onBrowseAllTemplates,
  onLoadTemplates,
}: TemplatePickerDialogProps) {
  const search = templateSearch.toLowerCase();
  const userTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(search) ||
      template.subject.toLowerCase().includes(search),
  );
  const matchingQuickStartTemplates = quickStartTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(search) ||
      template.subject.toLowerCase().includes(search),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          onLoadTemplates();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
          <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Use</span> Template
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>Select a template to use as a starting point</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Pen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={templateSearch}
              onChange={(e) => onTemplateSearchChange(e.target.value)}
            />
          </div>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {userTemplates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Your Templates</h4>
                  {userTemplates.map((template) => (
                    <button
                      key={template.$id}
                      type="button"
                      onClick={() => onApplyTemplate(template)}
                      className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium mb-1">{template.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {template.subject}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {matchingQuickStartTemplates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Quick Start
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {matchingQuickStartTemplates.map((template, index) => {
                      // Convert QuickStartTemplate to EmailTemplate-compatible object
                      const templateAsEmailTemplate: EmailTemplate = {
                        $id: `quickstart_${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                        name: template.name,
                        subject: template.subject,
                        content: template.content,
                        category: "quickstart",
                        user_email: "",
                      };
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => onApplyTemplate(templateAsEmailTemplate)}
                          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-lg">{template.icon}</span>
                          <span className="text-sm font-medium">{template.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={onBrowseAllTemplates}>
                <FileText className="h-4 w-4 mr-2" />
                Browse All Templates
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
