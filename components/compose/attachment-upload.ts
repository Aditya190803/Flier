import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";

import type { ComposeAttachment } from "./compose-types";

/** Files >= this size upload to Appwrite instead of base64. */
export const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = (error) => reject(error);
  });
}

export function createProcessingAttachments(
  files: FileList | File[],
): ComposeAttachment[] {
  const list = Array.from(files);
  return list.map((file, i) => ({
    tempId: `temp_${Date.now()}_${i}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    data: "processing",
    fileSize: file.size,
    isProcessing: true,
  }));
}

async function uploadFileToAppwrite(file: File): Promise<{
  fileName: string;
  url: string;
  fileSize: number;
  appwrite_file_id: string;
}> {
  const formData = new FormData();
  formData.append("files", file);
  const csrfToken = getCookie(CSRF_TOKEN_NAME);
  const response = await fetch("/api/upload-attachment", {
    method: "POST",
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
    body: formData,
  });
  const result = await response.json();
  if (result.success && result.uploads?.[0] && !result.uploads[0].error) {
    return result.uploads[0];
  }
  throw new Error(result.uploads?.[0]?.error || "Upload failed");
}

export type AttachmentProcessResult = {
  tempId: string;
  success: boolean;
  name: string;
  update?: Partial<ComposeAttachment>;
};

/** Process one file; caller applies update to state. */
export async function processAttachmentFile(
  file: File,
  tempId: string,
): Promise<AttachmentProcessResult> {
  try {
    if (file.size < LARGE_FILE_THRESHOLD) {
      componentLogger.debug(`Encoding file to base64`, { name: file.name });
      const base64 = await fileToBase64(file);
      return {
        tempId,
        success: true,
        name: file.name,
        update: {
          data: base64,
          isProcessing: false,
          tempId: undefined,
        },
      };
    }

    componentLogger.debug(`Uploading file to Appwrite`, { name: file.name });
    const upload = await uploadFileToAppwrite(file);
    return {
      tempId,
      success: true,
      name: file.name,
      update: {
        data: "appwrite",
        appwriteFileId: upload.appwrite_file_id,
        appwriteUrl: upload.url,
        isProcessing: false,
        tempId: undefined,
      },
    };
  } catch (error) {
    componentLogger.error(
      `Error processing file ${file.name}`,
      error instanceof Error ? error : undefined,
    );
    return { tempId, success: false, name: file.name };
  }
}

/** Upload base64 attachment for draft persistence. */
export async function ensureAppwriteAttachment(
  attachment: ComposeAttachment,
): Promise<{
  fileName: string;
  fileUrl: string;
  fileSize: number;
  appwrite_file_id: string;
}> {
  if (attachment.appwriteFileId) {
    return {
      fileName: attachment.name,
      fileUrl: attachment.appwriteUrl || "",
      fileSize: attachment.fileSize || 0,
      appwrite_file_id: attachment.appwriteFileId,
    };
  }

  if (attachment.data && attachment.data !== "appwrite") {
    const byteCharacters = atob(attachment.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: attachment.type,
    });
    const file = new File([blob], attachment.name, { type: attachment.type });
    const upload = await uploadFileToAppwrite(file);
    return {
      fileName: upload.fileName,
      fileUrl: upload.url,
      fileSize: upload.fileSize,
      appwrite_file_id: upload.appwrite_file_id,
    };
  }

  return {
    fileName: attachment.name,
    fileUrl: "",
    fileSize: attachment.fileSize || 0,
    appwrite_file_id: "",
  };
}
