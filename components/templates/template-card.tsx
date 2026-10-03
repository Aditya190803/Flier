import { Copy, Edit, History, Mail, MoreVertical, Trash2 } from "lucide-react";

import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailTemplate } from "@/lib/appwrite";
import { sanitizeHTML } from "@/lib/email-formatting/sanitization";

interface TemplateCardProps {
  template: EmailTemplate;
  categoryLabel: string;
  categoryColor: string;
  formatDate: (value: string) => string;
  onUseTemplate: (template: EmailTemplate) => void;
  onEdit: (template: EmailTemplate) => void;
  onDuplicate: (template: EmailTemplate) => void;
  onShowVersions: (template: EmailTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({
  template,
  categoryLabel,
  categoryColor,
  formatDate,
  onUseTemplate,
  onEdit,
  onDuplicate,
  onShowVersions,
  onDelete,
}: TemplateCardProps) {
  return (
    <Card className="group flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={`text-xs ${categoryColor} text-white border-0`}>
                {categoryLabel}
              </Badge>
            </div>
            <CardTitle className="text-lg truncate">{template.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onUseTemplate(template)}>
                <Mail className="h-4 w-4 mr-2" />
                Use Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShowVersions(template)}>
                <History className="h-4 w-4 mr-2" />
                Version History
              </DropdownMenuItem>
              {template.$id ? (
                <DeleteConfirmationDialog
                  trigger={
                    <DropdownMenuItem
                      onSelect={(event) => event.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  }
                  title="Delete Template"
                  description={
                    <>
                      Are you sure you want to delete "{template.name}"? This action cannot be
                      undone.
                    </>
                  }
                  onConfirm={() => onDelete(template.$id!)}
                />
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-muted-foreground">{template.subject}</span>
          </div>
          <div className="text-sm text-muted-foreground line-clamp-3 prose-sm">
            {(() => {
              if (!template.content) {
                return "No content";
              }
              // Sanitize HTML first, then strip tags for plain text preview
              const sanitized = sanitizeHTML(template.content);
              const plainText = sanitized
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              return plainText.slice(0, 150) || "No content";
            })()}
          </div>
        </div>
      </CardContent>
      <div className="px-6 pb-4 pt-2 border-t mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>
              {(() => {
                const dateValue = template.updated_at ?? template.created_at;
                return dateValue ? formatDate(dateValue) : "Unknown date";
              })()}
            </span>
          </div>
          <Button size="sm" onClick={() => onUseTemplate(template)}>
            Use
          </Button>
        </div>
      </div>
    </Card>
  );
}
