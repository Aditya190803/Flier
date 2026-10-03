export function convertGoogleDriveLink(url: string): string | null {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
  }

  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`;
  }

  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/export/pdf`;
  }

  return null;
}

export function convertOneDriveLink(url: string): string | null {
  if (url.includes("1drv.ms")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}download=1`;
  }

  if (url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
    let downloadUrl = url.replace("/embed", "/download");
    downloadUrl = downloadUrl.replace("action=view", "action=download");
    downloadUrl = downloadUrl.replace("action=embed", "action=download");

    if (!downloadUrl.includes("download=1") && !downloadUrl.includes("action=download")) {
      const separator = downloadUrl.includes("?") ? "&" : "?";
      downloadUrl = `${downloadUrl}${separator}download=1`;
    }

    return downloadUrl;
  }

  return null;
}

export function getDirectDownloadUrl(url: string): string {
  const trimmedUrl = url.trim();

  if (trimmedUrl.includes("drive.google.com") || trimmedUrl.includes("docs.google.com")) {
    const converted = convertGoogleDriveLink(trimmedUrl);
    if (converted) {
      return converted;
    }
  }

  if (
    trimmedUrl.includes("1drv.ms") ||
    trimmedUrl.includes("onedrive.live.com") ||
    trimmedUrl.includes("sharepoint.com")
  ) {
    const converted = convertOneDriveLink(trimmedUrl);
    if (converted) {
      return converted;
    }
  }

  if (trimmedUrl.includes("dropbox.com")) {
    return trimmedUrl
      .replace("dl=0", "dl=1")
      .replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  return trimmedUrl;
}

export function getGooglePreviewUrl(url: string): string {
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
  }

  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/preview`;
  }

  if (url.includes("/preview")) {
    return url;
  }

  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export function isAttachmentUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim().toLowerCase();
  const extensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".json",
    ".xlsx",
    ".zip",
    ".jpg",
    ".png",
    ".jpeg",
  ];

  if (extensions.some((ext) => trimmed.endsWith(ext))) {
    return true;
  }

  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com") ||
    trimmed.includes("1drv.ms") ||
    trimmed.includes("onedrive") ||
    trimmed.includes("sharepoint") ||
    trimmed.includes("dropbox.com")
  ) {
    return true;
  }

  return (
    trimmed.includes("pdf") ||
    trimmed.includes("certificate") ||
    trimmed.includes("document") ||
    trimmed.includes("attachment")
  );
}

export function detectAttachmentColumn(headers: string[]): string | null {
  const keywords = [
    "pdf",
    "certificate",
    "attachment",
    "document",
    "file",
    "link",
    "url",
    "drive",
    "onedrive",
    "dropbox",
    "doc",
    "docx",
    "ppt",
    "pptx",
  ];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();

    if (
      lowerHeader === "pdf" ||
      lowerHeader === "attachment" ||
      lowerHeader === "file" ||
      lowerHeader === "link"
    ) {
      return header;
    }

    if (keywords.some((keyword) => lowerHeader.includes(keyword))) {
      return header;
    }
  }

  return null;
}

export function getAttachmentSource(
  url: string,
): "google-drive" | "onedrive" | "dropbox" | "direct" {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) {
    return "google-drive";
  }

  if (
    lowerUrl.includes("1drv.ms") ||
    lowerUrl.includes("onedrive") ||
    lowerUrl.includes("sharepoint")
  ) {
    return "onedrive";
  }

  if (lowerUrl.includes("dropbox")) {
    return "dropbox";
  }

  return "direct";
}
