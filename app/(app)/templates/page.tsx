"use client";

import { useEffect, useState, useMemo } from "react";

import { FileText, Search } from "lucide-react";

import { PaginationControls } from "@/components/pagination";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateEditorDialog } from "@/components/templates/template-editor-dialog";
import { TemplateVersionHistoryDialog } from "@/components/templates/template-version-history-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page-shell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePagination } from "@/hooks/usePagination";
import { useTemplateActions } from "@/hooks/useTemplateActions";
import { useTemplates } from "@/hooks/useTemplates";
import type { EmailTemplate } from "@/lib/appwrite";
import { TEMPLATE_CATEGORIES, getCategoryInfo } from "@/lib/templates/default-templates";

import { CreateTemplateDialog, type NewTemplateState } from "./_components/create-template-dialog";
import { StarterTemplatesSection } from "./_components/starter-templates-section";
import { TemplatesPageSkeleton } from "./_components/templates-page-skeleton";

export default function TemplatesPage() {
  const { session, status, router } = useAuthGuard();
  const { templates, setTemplates, isLoadingData, fetchTemplates } = useTemplates(
    session?.user?.email ?? undefined,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saveVersion, setSaveVersion] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [newTemplate, setNewTemplate] = useState<NewTemplateState>({
    name: "",
    subject: "",
    content: "",
    category: "other",
  });

  const {
    isLoading,
    showVersionsDialog,
    setShowVersionsDialog,
    versioningTemplate,
    setVersioningTemplate,
    versions,
    setVersions,
    isLoadingVersions,
    createTemplate: createTemplateApi,
    addDefaultTemplate,
    addAllDefaultTemplates,
    applyDefaultTemplate,
    updateTemplate: updateTemplateApi,
    deleteTemplate,
    duplicateTemplate,
    applyTemplate,
    fetchVersions,
    restoreVersion,
  } = useTemplateActions({
    userEmail: session?.user?.email,
    router,
    templates,
    setTemplates,
    fetchTemplates,
  });

  const resetNewTemplate = () => {
    setNewTemplate({ name: "", subject: "", content: "", category: "other" });
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      resetNewTemplate();
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    if (!isMounted) {
      return "";
    }
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const createTemplate = () => {
    createTemplateApi(newTemplate);
    resetNewTemplate();
    setShowCreateDialog(false);
  };

  const updateTemplate = () => {
    if (!editingTemplate) {
      return;
    }
    updateTemplateApi(editingTemplate, saveVersion, changeNote);
    setShowEditDialog(false);
    setEditingTemplate(null);
    setSaveVersion(false);
    setChangeNote("");
  };

  // Filter templates - must be before usePagination hook
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  // Use pagination hook for templates - must be called unconditionally before any early returns
  const {
    paginatedItems: paginatedTemplates,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    hasPreviousPage,
    hasNextPage,
  } = usePagination(filteredTemplates, { pageSize: 12, initialPage: 1 });

  if (status === "loading" || !isMounted || isLoadingData) {
    return <TemplatesPageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  const starterSection = (
    <StarterTemplatesSection
      templates={templates}
      isLoading={isLoading}
      onAddAllDefaultTemplates={addAllDefaultTemplates}
      onApplyDefaultTemplate={applyDefaultTemplate}
      onAddDefaultTemplate={addDefaultTemplate}
    />
  );
  // New users have nothing to search, so lead with the starters instead of an empty state.
  const isFirstRun = templates.length === 0;

  return (
    <>
      <PageShell>
        <PageHeader
          title="Templates"
          description="Reusable emails you can start a campaign from"
          actions={
            <CreateTemplateDialog
              open={showCreateDialog}
              onOpenChange={handleCreateDialogOpenChange}
              newTemplate={newTemplate}
              setNewTemplate={setNewTemplate}
              isLoading={isLoading}
              onCreateTemplate={createTemplate}
              onCancel={() => {
                setShowCreateDialog(false);
                resetNewTemplate();
              }}
            />
          }
        />

        {isFirstRun ? (
          starterSection
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {paginatedTemplates.length} of {filteredTemplates.length} templates
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedTemplates.map((template) => {
                    const categoryInfo = getCategoryInfo(template.category);
                    return (
                      <TemplateCard
                        key={template.$id}
                        template={template}
                        categoryLabel={categoryInfo.label}
                        categoryColor={categoryInfo.color}
                        formatDate={formatDate}
                        onUseTemplate={applyTemplate}
                        onEdit={(currentTemplate) => {
                          setEditingTemplate(currentTemplate);
                          setShowEditDialog(true);
                        }}
                        onDuplicate={duplicateTemplate}
                        onShowVersions={fetchVersions}
                        onDelete={deleteTemplate}
                      />
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={filteredTemplates.length}
                      hasPreviousPage={hasPreviousPage}
                      hasNextPage={hasNextPage}
                      onPageChange={goToPage}
                      onPageSizeChange={setPageSize}
                      getPageNumbers={() => Array.from({ length: totalPages }, (_, i) => i + 1)}
                      startIndex={(currentPage - 1) * pageSize}
                      endIndex={Math.min(currentPage * pageSize - 1, filteredTemplates.length - 1)}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No templates found"
                description="Try adjusting your search or filter"
              />
            )}

            {starterSection}
          </>
        )}
      </PageShell>

      <TemplateEditorDialog
        open={showEditDialog}
        isLoading={isLoading}
        editingTemplate={editingTemplate}
        categories={TEMPLATE_CATEGORIES}
        saveVersion={saveVersion}
        changeNote={changeNote}
        onOpenChange={setShowEditDialog}
        onEditingTemplateChange={setEditingTemplate}
        onSaveVersionChange={setSaveVersion}
        onChangeNoteChange={setChangeNote}
        onUpdateTemplate={updateTemplate}
        onCancel={() => {
          setShowEditDialog(false);
          setEditingTemplate(null);
          setSaveVersion(false);
          setChangeNote("");
        }}
      />

      <TemplateVersionHistoryDialog
        open={showVersionsDialog}
        versions={versions}
        isLoadingVersions={isLoadingVersions}
        isLoading={isLoading}
        versioningTemplate={versioningTemplate}
        formatDate={formatDate}
        onOpenChange={setShowVersionsDialog}
        onRestoreVersion={restoreVersion}
        onClose={() => {
          setShowVersionsDialog(false);
          setVersioningTemplate(null);
          setVersions([]);
        }}
      />
    </>
  );
}
