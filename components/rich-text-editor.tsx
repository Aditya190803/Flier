"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { useEditor, EditorContent } from "@tiptap/react";

import { EditorDialogs } from "@/components/rich-text-editor/dialogs";
import { createRichTextEditorExtensions } from "@/components/rich-text-editor/extensions";
import { createEditorPasteHandler } from "@/components/rich-text-editor/paste-handler";
import { EditorToolbar } from "@/components/rich-text-editor/toolbar";
import { generateLinkId } from "@/lib/analytics";

import type { Editor } from "@tiptap/react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "",
  className = "",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [_tableRows, _setTableRows] = useState(3);
  const [_tableCols, _setTableCols] = useState(3);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
      if (
        highlightPickerRef.current &&
        !highlightPickerRef.current.contains(e.target as Node)
      ) {
        setIsHighlightPickerOpen(false);
      }
      if (
        headingMenuRef.current &&
        !headingMenuRef.current.contains(e.target as Node)
      ) {
        setIsHeadingMenuOpen(false);
      }
      if (
        tableMenuRef.current &&
        !tableMenuRef.current.contains(e.target as Node)
      ) {
        setIsTableMenuOpen(false);
      }
      if (
        alignMenuRef.current &&
        !alignMenuRef.current.contains(e.target as Node)
      ) {
        setIsAlignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure we're only rendering on the client to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: createRichTextEditorExtensions(placeholder),
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none min-h-[150px] p-3 font-sans text-[14px] leading-[1.5] text-foreground",
        spellcheck: "true",
        style:
          "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; word-spacing: normal; letter-spacing: normal;",
      },
      handlePaste: createEditorPasteHandler(() => editorRef.current),
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Helper function to convert plain text URLs to links in HTML content
  const processUrlsInContent = useCallback((html: string): string => {
    if (!html) {
      return html;
    }

    // Don't process if content is empty or just a paragraph
    if (html === "<p></p>" || html === "") {
      return html;
    }

    // URL regex pattern - match URLs not already inside href or src attributes
    const urlPattern = /(?<!href=["']|src=["'])(https?:\/\/[^\s<>"']+)/gi;

    // First, let's identify which URLs are already wrapped in anchor tags
    // by temporarily replacing them with placeholders
    let processed = html;
    const existingLinks: string[] = [];

    // Extract existing anchor tags
    processed = processed.replace(
      /<a\s[^>]*href=["'][^"']*["'][^>]*>.*?<\/a>/gi,
      (match) => {
        existingLinks.push(match);
        return `{{EXISTING_LINK_${existingLinks.length - 1}}}`;
      },
    );

    // Now convert any remaining plain URLs to links
    processed = processed.replace(urlPattern, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow" class="text-blue-600 underline cursor-pointer">${url}</a>`;
    });

    // Restore existing links
    existingLinks.forEach((link, index) => {
      processed = processed.replace(`{{EXISTING_LINK_${index}}}`, link);
    });

    return processed;
  }, []);

  // Sync content prop with editor when it changes externally (e.g., loading draft data)
  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if the content is different from what's in the editor
      const currentContent = editor.getHTML();
      // Normalize for comparison (both empty cases)
      const isCurrentEmpty = !currentContent || currentContent === "<p></p>";
      const isNewEmpty = !content || content === "<p></p>";

      if (isCurrentEmpty && !isNewEmpty) {
        // Editor is empty but we have new content - set it
        // Process URLs to convert plain text URLs to links
        const processedContent = processUrlsInContent(content);
        editor.commands.setContent(processedContent, { emitUpdate: false });
      } else if (content && currentContent !== content && !editor.isFocused) {
        // Content changed externally and editor is not focused - update it
        // Process URLs to convert plain text URLs to links
        const processedContent = processUrlsInContent(content);
        editor.commands.setContent(processedContent, { emitUpdate: false });
      }
    }
  }, [editor, content, processUrlsInContent]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor
        .chain()
        .focus()
        .setLink({ href: linkUrl, "data-link-id": generateLinkId() } as any)
        .run();
      setLinkUrl("");
      setIsLinkDialogOpen(false);
    }
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
      setLinkUrl("");
      setIsLinkDialogOpen(false);
    }
  }, [editor]);

  // Function to handle link dialog opening
  const handleLinkDialog = useCallback(() => {
    if (editor) {
      const { href } = editor.getAttributes("link");
      if (href) {
        setLinkUrl(href);
      } else {
        setLinkUrl("");
      }
      setIsLinkDialogOpen(true);
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setIsImageDialogOpen(false);
    }
  }, [editor, imageUrl]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          editor.chain().focus().setImage({ src: base64 }).run();
          setIsImageDialogOpen(false);
        };
        reader.readAsDataURL(file);
      }
    },
    [editor],
  );

  const setTextColor = useCallback(
    (color: string) => {
      if (!editor) {
        return;
      }
      if (!color || color === "inherit") {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
      setIsColorPickerOpen(false);
    },
    [editor],
  );

  const setHighlightColor = useCallback(
    (color: string) => {
      if (editor) {
        editor.chain().focus().toggleHighlight({ color }).run();
        setIsHighlightPickerOpen(false);
      }
    },
    [editor],
  );

  const removeHighlight = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetHighlight().run();
      setIsHighlightPickerOpen(false);
    }
  }, [editor]);

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();
        setIsTableMenuOpen(false);
        setHoveredCell(null);
      }
    },
    [editor],
  );

  const addTableColumn = useCallback(() => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run();
    }
  }, [editor]);

  const addTableRow = useCallback(() => {
    if (editor) {
      editor.chain().focus().addRowAfter().run();
    }
  }, [editor]);

  const deleteTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteTable().run();
      setIsTableMenuOpen(false);
    }
  }, [editor]);
  if (!editor || !isMounted) {
    return (
      <div className="border rounded-lg overflow-hidden relative bg-white dark:bg-zinc-900">
        <div className="border-b bg-gray-50 dark:bg-zinc-800 p-1.5">
          <div className="flex items-center gap-1 h-7">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-6 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="min-h-[200px] p-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg overflow-visible relative bg-white dark:bg-zinc-900 ${className}`}
      suppressHydrationWarning
    >
      <EditorToolbar
        editor={editor}
        isHeadingMenuOpen={isHeadingMenuOpen}
        setIsHeadingMenuOpen={setIsHeadingMenuOpen}
        isColorPickerOpen={isColorPickerOpen}
        setIsColorPickerOpen={setIsColorPickerOpen}
        isHighlightPickerOpen={isHighlightPickerOpen}
        setIsHighlightPickerOpen={setIsHighlightPickerOpen}
        isAlignMenuOpen={isAlignMenuOpen}
        setIsAlignMenuOpen={setIsAlignMenuOpen}
        isTableMenuOpen={isTableMenuOpen}
        setIsTableMenuOpen={setIsTableMenuOpen}
        hoveredCell={hoveredCell}
        setHoveredCell={setHoveredCell}
        headingMenuRef={headingMenuRef}
        colorPickerRef={colorPickerRef}
        highlightPickerRef={highlightPickerRef}
        alignMenuRef={alignMenuRef}
        tableMenuRef={tableMenuRef}
        onSetTextColor={setTextColor}
        onSetHighlightColor={setHighlightColor}
        onRemoveHighlight={removeHighlight}
        onInsertTable={insertTable}
        onAddTableColumn={addTableColumn}
        onAddTableRow={addTableRow}
        onDeleteTable={deleteTable}
        onOpenLinkDialog={handleLinkDialog}
        onOpenImageDialog={() => setIsImageDialogOpen(true)}
      />

      <EditorDialogs
        editor={editor}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        isLinkDialogOpen={isLinkDialogOpen}
        setIsLinkDialogOpen={setIsLinkDialogOpen}
        isImageDialogOpen={isImageDialogOpen}
        setIsImageDialogOpen={setIsImageDialogOpen}
        onAddLink={addLink}
        onRemoveLink={removeLink}
        onAddImage={addImage}
        onImageUpload={handleImageUpload}
      />

      {/* Editor Content */}
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto"
        suppressHydrationWarning
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[180px]"
        />
      </div>

      {/* Editor Styles — theme tokens so light/dark both work */}
      <style jsx global>{`
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }
        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        .ProseMirror h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1em 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid var(--border);
          margin: 1em 0;
          padding-left: 1em;
          color: var(--muted-foreground);
          font-style: italic;
        }
        .ProseMirror pre {
          background: var(--muted);
          color: var(--foreground);
          font-family: "JetBrains Mono", monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1em 0;
        }
        .ProseMirror code {
          background: var(--muted);
          color: var(--destructive);
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.9em;
        }
        .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid var(--border);
          margin: 1.5em 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror ul ul {
          list-style-type: circle;
        }
        .ProseMirror ul ul ul {
          list-style-type: square;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1em 0;
          overflow: hidden;
          width: 100%;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid var(--border);
          padding: 0.5em;
          position: relative;
          vertical-align: top;
          min-width: 100px;
        }
        .ProseMirror table th {
          background: var(--muted);
          font-weight: bold;
        }
        .ProseMirror table .selectedCell {
          background: color-mix(in oklch, var(--primary) 22%, transparent);
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 0.5em 0;
        }
        .ProseMirror a {
          color: var(--primary);
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror mark {
          background-color: #fef08a;
          border-radius: 0.25em;
          padding: 0.1em 0.2em;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          pointer-events: none;
          position: absolute;
          height: 0;
        }
      `}</style>
    </div>
  );
}
