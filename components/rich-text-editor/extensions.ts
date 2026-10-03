import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

const CustomLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-link-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-id"),
        renderHTML: (attributes) => {
          if (!attributes["data-link-id"]) {
            return {};
          }

          return {
            "data-link-id": attributes["data-link-id"],
          };
        },
      },
    };
  },
});

export function createRichTextEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      link: false,
      underline: false,
      paragraph: {
        HTMLAttributes: {
          class: "editor-paragraph",
        },
      },
      hardBreak: {
        HTMLAttributes: {
          class: "editor-break",
        },
        keepMarks: false,
      },
      heading: {
        levels: [1, 2, 3, 4],
      },
      codeBlock: {
        HTMLAttributes: {
          class: "code-block",
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: "blockquote",
        },
      },
      horizontalRule: {
        HTMLAttributes: {
          class: "hr",
        },
      },
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    Typography,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    CustomLink.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: "text-blue-600 underline cursor-pointer",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    Image.configure({
      HTMLAttributes: {
        class: "max-w-full h-auto rounded-lg",
      },
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "email-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder: placeholder || "Write your email content here...",
    }),
  ];
}
