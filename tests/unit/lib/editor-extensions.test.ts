import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vite-plus/test";

import { createRichTextEditorExtensions } from "@/components/rich-text-editor/extensions";

describe("rich text editor extensions", () => {
  it("registers one link and underline extension while retaining tracked link attributes", () => {
    const editor = new Editor({
      extensions: createRichTextEditorExtensions("Write a message"),
      content: '<p><a href="https://example.com" data-link-id="link-1"><u>Hello</u></a></p>',
    });
    try {
      const names = editor.extensionManager.extensions.map((extension) => extension.name);
      expect(names.filter((name) => name === "link")).toHaveLength(1);
      expect(names.filter((name) => name === "underline")).toHaveLength(1);
      expect(editor.getHTML()).toContain('data-link-id="link-1"');
      expect(editor.getHTML()).toContain("<u>");
    } finally {
      editor.destroy();
    }
  });
});
