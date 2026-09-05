export type AttachmentFileType =
  "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "other";

export type AttachmentSource =
  "google-drive" | "onedrive" | "dropbox" | "direct";

export interface AttachmentMetadata {
  fileName: string;
  fileType: AttachmentFileType;
  contentType?: string;
  source: AttachmentSource;
  accessible: boolean;
  originalUrl: string;
  fileSize: number | null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractFilenameFromContentDisposition(
  contentDisposition: string,
): string | null {
  const filenameStarMatch = contentDisposition.match(
    /filename\*=(?:UTF-8'[^']*'|)([^;]+)/i,
  );
  if (filenameStarMatch?.[1]) {
    return safeDecodeURIComponent(
      filenameStarMatch[1].trim().replace(/^["']|["']$/g, ""),
    );
  }

  const filenameMatch = contentDisposition.match(
    /filename=(?:["']?)([^"';\n]+)(?:["']?)/i,
  );
  if (filenameMatch?.[1]) {
    return safeDecodeURIComponent(filenameMatch[1].trim());
  }

  return null;
}

export function extractAttachmentFileName(
  url: string,
  contentDisposition?: string | null,
  recipientName?: string,
  contentType?: string,
): string {
  if (contentDisposition) {
    const filename = extractFilenameFromContentDisposition(contentDisposition);
    if (filename) {
      return filename;
    }
  }

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart && lastPart.includes(".")) {
      return safeDecodeURIComponent(lastPart);
    }
  } catch {
    // Ignore invalid URLs and continue to fallback generation.
  }

  const sanitizedName = recipientName
    ? recipientName.replace(/[^a-zA-Z0-9]/g, "_")
    : "attachment";

  let extension = ".pdf";

  if (contentType) {
    if (contentType.includes("word") || contentType.includes("docx")) {
      extension = ".docx";
    } else if (contentType.includes("doc")) {
      extension = ".doc";
    } else if (
      contentType.includes("powerpoint") ||
      contentType.includes("pptx")
    ) {
      extension = ".pptx";
    } else if (contentType.includes("ppt")) {
      extension = ".ppt";
    } else if (contentType.includes("excel") || contentType.includes("xlsx")) {
      extension = ".xlsx";
    } else if (contentType.includes("xls")) {
      extension = ".xls";
    } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = ".jpg";
    } else if (contentType.includes("png")) {
      extension = ".png";
    } else if (contentType.includes("gif")) {
      extension = ".gif";
    } else if (contentType.includes("zip")) {
      extension = ".zip";
    }
  }

  return `${sanitizedName}${extension}`;
}

function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDotIndex = pathname.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      return pathname.slice(lastDotIndex).toLowerCase();
    }
  } catch {
    // Invalid URL, fall back to checking the whole string
    const lastDotIndex = url.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      return url.slice(lastDotIndex).toLowerCase();
    }
  }
  return "";
}

export function getAttachmentFileType(
  url: string,
  contentType?: string,
): AttachmentFileType {
  const lowerType = (contentType || "").toLowerCase();
  const extension = getExtensionFromUrl(url);

  if (lowerType.includes("pdf") || extension === ".pdf") {
    return "pdf";
  }
  if (
    lowerType.includes("image") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/.test(extension)
  ) {
    return "image";
  }
  if (
    lowerType.includes("word") ||
    /\.(doc|docx)$/.test(extension) ||
    url.toLowerCase().includes("/document/")
  ) {
    return "document";
  }
  if (
    lowerType.includes("excel") ||
    lowerType.includes("spreadsheet") ||
    /\.(xls|xlsx)$/.test(extension) ||
    url.toLowerCase().includes("/spreadsheets/")
  ) {
    return "spreadsheet";
  }
  if (
    lowerType.includes("powerpoint") ||
    lowerType.includes("presentation") ||
    /\.(ppt|pptx)$/.test(extension) ||
    url.toLowerCase().includes("/presentation/")
  ) {
    return "presentation";
  }

  return "other";
}

export function personalizeAttachmentFileName(
  fileName: string,
  recipientName?: string,
): string {
  if (!recipientName || !fileName.includes(".")) {
    return fileName;
  }

  const ext = fileName.substring(fileName.lastIndexOf("."));
  const baseName = fileName.substring(0, fileName.lastIndexOf("."));

  if (
    baseName === "attachment" ||
    baseName === "document" ||
    baseName === "file"
  ) {
    return `${recipientName.replace(/[^a-zA-Z0-9]/g, "_")}${ext}`;
  }

  return fileName;
}
