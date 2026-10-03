import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Editor } from "@tiptap/react";

interface EditorDialogsProps {
  editor: Editor;
  linkUrl: string;
  setLinkUrl: (value: string) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  isLinkDialogOpen: boolean;
  setIsLinkDialogOpen: (open: boolean) => void;
  isImageDialogOpen: boolean;
  setIsImageDialogOpen: (open: boolean) => void;
  onAddLink: () => void;
  onRemoveLink: () => void;
  onAddImage: () => void;
  onImageUpload: (file: File) => Promise<void>;
}

export function EditorDialogs({
  editor,
  linkUrl,
  setLinkUrl,
  imageUrl,
  setImageUrl,
  isLinkDialogOpen,
  setIsLinkDialogOpen,
  isImageDialogOpen,
  setIsImageDialogOpen,
  onAddLink,
  onRemoveLink,
  onAddImage,
  onImageUpload,
}: EditorDialogsProps) {
  return (
    <>
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editor.isActive("link") ? "Edit Link" : "Add Link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="link-url" className="text-xs">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-xs h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkUrl) {
                    onAddLink();
                  }
                  if (e.key === "Escape") {
                    setIsLinkDialogOpen(false);
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onAddLink} disabled={!linkUrl} size="sm" className="text-xs">
                {editor.isActive("link") ? "Update" : "Add"}
              </Button>
              {editor.isActive("link") && (
                <Button variant="outline" onClick={onRemoveLink} size="sm" className="text-xs">
                  Remove
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsLinkDialogOpen(false)}
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="image-url" className="text-xs">
                Image URL
              </Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && imageUrl) {
                    onAddImage();
                  }
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">or</div>
            <div>
              <Label htmlFor="image-upload" className="text-xs">
                Upload Image
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="text-xs h-8"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      await onImageUpload(file);
                    } catch {
                      toast.error("Failed to upload image");
                    } finally {
                      e.target.value = "";
                    }
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onAddImage} disabled={!imageUrl} size="sm" className="text-xs">
                Insert
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsImageDialogOpen(false)}
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
