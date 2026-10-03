import type React from "react";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Redo,
  Strikethrough,
  TableIcon,
  Trash2,
  Type,
  UnderlineIcon,
  Undo,
} from "lucide-react";

import { HIGHLIGHT_COLORS, TEXT_COLORS } from "@/components/rich-text-editor/constants";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
  isHeadingMenuOpen: boolean;
  setIsHeadingMenuOpen: (open: boolean) => void;
  isColorPickerOpen: boolean;
  setIsColorPickerOpen: (open: boolean) => void;
  isHighlightPickerOpen: boolean;
  setIsHighlightPickerOpen: (open: boolean) => void;
  isAlignMenuOpen: boolean;
  setIsAlignMenuOpen: (open: boolean) => void;
  isTableMenuOpen: boolean;
  setIsTableMenuOpen: (open: boolean) => void;
  hoveredCell: { row: number; col: number } | null;
  setHoveredCell: (cell: { row: number; col: number } | null) => void;
  headingMenuRef: React.RefObject<HTMLDivElement | null>;
  colorPickerRef: React.RefObject<HTMLDivElement | null>;
  highlightPickerRef: React.RefObject<HTMLDivElement | null>;
  alignMenuRef: React.RefObject<HTMLDivElement | null>;
  tableMenuRef: React.RefObject<HTMLDivElement | null>;
  onSetTextColor: (color: string) => void;
  onSetHighlightColor: (color: string) => void;
  onRemoveHighlight: () => void;
  onInsertTable: (rows: number, cols: number) => void;
  onAddTableColumn: () => void;
  onAddTableRow: () => void;
  onDeleteTable: () => void;
  onOpenLinkDialog: () => void;
  onOpenImageDialog: () => void;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 w-7 p-0 ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50"
          : "hover:bg-gray-100 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </Button>
  );
}

function DropdownMenu({
  isOpen,
  onToggle,
  buttonContent,
  title,
  children,
  menuRef,
  isActive = false,
}: {
  isOpen: boolean;
  onToggle: () => void;
  buttonContent: React.ReactNode;
  title: string;
  children: React.ReactNode;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isActive?: boolean;
}) {
  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        title={title}
        className={`h-7 px-1.5 gap-0.5 ${
          isActive
            ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50"
            : "hover:bg-gray-100 dark:hover:bg-zinc-700"
        }`}
      >
        {buttonContent}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-[100] bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 p-1.5 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function EditorToolbar({
  editor,
  isHeadingMenuOpen,
  setIsHeadingMenuOpen,
  isColorPickerOpen,
  setIsColorPickerOpen,
  isHighlightPickerOpen,
  setIsHighlightPickerOpen,
  isAlignMenuOpen,
  setIsAlignMenuOpen,
  isTableMenuOpen,
  setIsTableMenuOpen,
  hoveredCell,
  setHoveredCell,
  headingMenuRef,
  colorPickerRef,
  highlightPickerRef,
  alignMenuRef,
  tableMenuRef,
  onSetTextColor,
  onSetHighlightColor,
  onRemoveHighlight,
  onInsertTable,
  onAddTableColumn,
  onAddTableRow,
  onDeleteTable,
  onOpenLinkDialog,
  onOpenImageDialog,
}: EditorToolbarProps) {
  return (
    <div className="border-b bg-gray-50 dark:bg-zinc-800 p-1.5 overflow-visible">
      <div className="flex items-center gap-0.5 flex-wrap">
        <DropdownMenu
          isOpen={isHeadingMenuOpen}
          onToggle={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
          buttonContent={<Type className="h-3.5 w-3.5" />}
          title="Headings"
          menuRef={headingMenuRef}
          isActive={editor.isActive("heading")}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded flex items-center gap-2 transition-colors"
            onClick={() => {
              editor.chain().focus().setParagraph().run();
              setIsHeadingMenuOpen(false);
            }}
          >
            <Type className="h-4 w-4" /> Normal Text
          </button>
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${
                level === 1
                  ? "text-lg font-bold"
                  : level === 2
                    ? "text-base font-bold"
                    : level === 3
                      ? "text-sm font-bold"
                      : "text-xs font-bold"
              } ${
                editor.isActive("heading", { level })
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : ""
              }`}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as 1 | 2 | 3 | 4 })
                  .run();
                setIsHeadingMenuOpen(false);
              }}
            >
              Heading {level}
            </button>
          ))}
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <DropdownMenu
          isOpen={isColorPickerOpen}
          onToggle={() => setIsColorPickerOpen(!isColorPickerOpen)}
          buttonContent={<Palette className="h-3.5 w-3.5" />}
          title="Text Color"
          menuRef={colorPickerRef}
        >
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Text Color</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  className="w-7 h-7 rounded-md border border-gray-200 dark:border-zinc-600 hover:scale-110 hover:shadow-md transition-all duration-150"
                  style={{
                    backgroundColor: c.color === "inherit" ? "var(--foreground)" : c.color,
                  }}
                  onClick={() => onSetTextColor(c.color)}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
        </DropdownMenu>

        <DropdownMenu
          isOpen={isHighlightPickerOpen}
          onToggle={() => setIsHighlightPickerOpen(!isHighlightPickerOpen)}
          buttonContent={<Highlighter className="h-3.5 w-3.5" />}
          title="Highlight"
          menuRef={highlightPickerRef}
          isActive={editor.isActive("highlight")}
        >
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Highlight Color
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.color}
                  className="w-7 h-7 rounded-md border border-gray-200 dark:border-zinc-600 hover:scale-110 hover:shadow-md transition-all duration-150"
                  style={{ backgroundColor: c.color }}
                  onClick={() => onSetHighlightColor(c.color)}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
            <button
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 rounded mt-2 text-gray-600 dark:text-gray-300 transition-colors"
              onClick={onRemoveHighlight}
            >
              ✕ Remove Highlight
            </button>
          </div>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <DropdownMenu
          isOpen={isAlignMenuOpen}
          onToggle={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
          buttonContent={<AlignLeft className="h-3.5 w-3.5" />}
          title="Alignment"
          menuRef={alignMenuRef}
        >
          {[
            { value: "left", icon: AlignLeft, label: "Align Left" },
            { value: "center", icon: AlignCenter, label: "Center" },
            { value: "right", icon: AlignRight, label: "Align Right" },
            { value: "justify", icon: AlignJustify, label: "Justify" },
          ].map((align) => {
            const Icon = align.icon;
            return (
              <button
                key={align.value}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${
                  editor.isActive({ textAlign: align.value })
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : ""
                }`}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .setTextAlign(align.value as any)
                    .run();
                  setIsAlignMenuOpen(false);
                }}
              >
                <Icon className="h-4 w-4" /> {align.label}
              </button>
            );
          })}
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <DropdownMenu
          isOpen={isTableMenuOpen}
          onToggle={() => setIsTableMenuOpen(!isTableMenuOpen)}
          buttonContent={<TableIcon className="h-3.5 w-3.5" />}
          title="Table"
          menuRef={tableMenuRef}
          isActive={editor.isActive("table")}
        >
          {!editor.isActive("table") ? (
            <div className="p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                Insert Table
              </p>
              <div className="grid grid-cols-6 gap-0.5 mb-2">
                {Array.from({ length: 6 }).map((_, rowIndex) =>
                  Array.from({ length: 6 }).map((_, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-5 h-5 border rounded-sm transition-colors ${
                        hoveredCell && rowIndex <= hoveredCell.row && colIndex <= hoveredCell.col
                          ? "bg-blue-500 border-blue-600"
                          : "bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 hover:bg-gray-200 dark:hover:bg-zinc-600"
                      }`}
                      onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onInsertTable(rowIndex + 1, colIndex + 1)}
                      title={`${rowIndex + 1} × ${colIndex + 1}`}
                      aria-label={`Insert ${rowIndex + 1} by ${colIndex + 1} table`}
                    />
                  )),
                )}
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {hoveredCell ? `${hoveredCell.row + 1} × ${hoveredCell.col + 1}` : "Select size"}
              </p>
            </div>
          ) : (
            <>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                onClick={onAddTableColumn}
              >
                <Plus className="h-4 w-4" /> Add Column
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                onClick={onAddTableRow}
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
              <div className="border-t border-gray-200 dark:border-zinc-600 my-1" />
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                onClick={onDeleteTable}
              >
                <Trash2 className="h-4 w-4" /> Delete Table
              </button>
            </>
          )}
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={onOpenLinkDialog}
          isActive={editor.isActive("link")}
          title={editor.isActive("link") ? "Edit Link" : "Add Link"}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton onClick={onOpenImageDialog} title="Insert Image">
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
    </div>
  );
}
