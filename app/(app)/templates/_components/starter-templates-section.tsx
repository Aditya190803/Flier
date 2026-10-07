import { Mail, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailTemplate } from "@/lib/appwrite";
import { DEFAULT_TEMPLATES, getCategoryInfo } from "@/lib/templates/default-templates";

const PERSONALIZATION_PLACEHOLDERS = [
  "{{name}}",
  "{{email}}",
  "{{company}}",
  "{{date}}",
  "{{topic}}",
];

interface StarterTemplatesSectionProps {
  templates: EmailTemplate[];
  isLoading: boolean;
  onAddAllDefaultTemplates: () => void;
  onApplyDefaultTemplate: (defaultTemplate: (typeof DEFAULT_TEMPLATES)[0]) => void;
  onAddDefaultTemplate: (defaultTemplate: (typeof DEFAULT_TEMPLATES)[0]) => void;
}

export function StarterTemplatesSection({
  templates,
  isLoading,
  onAddAllDefaultTemplates,
  onApplyDefaultTemplate,
  onAddDefaultTemplate,
}: StarterTemplatesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Starter Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick-start templates with placeholders for personalization
          </p>
        </div>
        <Button variant="outline" onClick={onAddAllDefaultTemplates} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add All to My Templates
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DEFAULT_TEMPLATES.map((template, index) => {
          const categoryInfo = getCategoryInfo(template.category);
          const isAlreadyAdded = templates.some(
            (t) => t.name.toLowerCase() === template.name.toLowerCase(),
          );

          return (
            <Card
              key={index}
              className={`group transition-all hover:shadow-md ${
                isAlreadyAdded ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {categoryInfo.label}
                      </Badge>
                    </div>
                  </div>
                  {isAlreadyAdded && (
                    <Badge variant="secondary" className="text-[10px]">
                      Added
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {template.subject}
                </p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => onApplyDefaultTemplate(template)}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => onAddDefaultTemplate(template)}
                    disabled={isAlreadyAdded}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {isAlreadyAdded ? "Added" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Personalization hint */}
      <Card className="mt-6 bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Personalization Placeholders</h4>
              <p className="text-xs text-muted-foreground mb-2">
                These templates use placeholders that get replaced with actual data when sending:
              </p>
              <div className="flex flex-wrap gap-2">
                {PERSONALIZATION_PLACEHOLDERS.map((placeholder) => (
                  <code
                    key={placeholder}
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                  >
                    {placeholder}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
