import { storageService } from "@/lib/appwrite";

export const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;

export interface UploadedAttachment {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface Base64AttachmentUploadInput {
  data: string;
  name: string;
  type: string;
}

export async function uploadAttachmentFile(file: File): Promise<UploadedAttachment> {
  return storageService.uploadFile(file, "");
}

function decodeBase64ToBytes(data: string): Uint8Array {
  if (typeof data !== "string" || data.trim() === "") {
    throw new Error("Attachment data must be a non-empty base64 string");
  }

  const normalized = data.trim().replace(/\s+/g, "");

  if (normalized.length % 4 === 1) {
    throw new Error("Invalid base64 attachment data");
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("Invalid base64 attachment data");
  }

  try {
    const byteCharacters = atob(normalized);
    const byteNumbers = new Uint8Array(byteCharacters.length);

    for (let index = 0; index < byteCharacters.length; index++) {
      byteNumbers[index] = byteCharacters.charCodeAt(index);
    }

    return byteNumbers;
  } catch {
    throw new Error("Invalid base64 attachment data");
  }
}

export async function uploadBase64Attachment({
  data,
  name,
  type,
}: Base64AttachmentUploadInput): Promise<UploadedAttachment> {
  const byteArray = decodeBase64ToBytes(data);
  const blob = new Blob(
    [
      byteArray.buffer.slice(
        byteArray.byteOffset,
        byteArray.byteOffset + byteArray.byteLength,
      ) as ArrayBuffer,
    ],
    { type },
  );
  const file = new File([blob], name, { type });

  return uploadAttachmentFile(file);
}
