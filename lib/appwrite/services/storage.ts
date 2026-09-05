import { clientLogger } from "../../client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "../../constants";
import { getCookie } from "../../utils";

// ============================================
// Storage Service (via API)
// ============================================

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getUploadResult(response: unknown): {
  uploads: Array<{
    error?: string;
    appwrite_file_id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  }>;
} {
  if (
    !response ||
    typeof response !== "object" ||
    !("uploads" in response) ||
    !Array.isArray((response as { uploads?: unknown }).uploads)
  ) {
    throw new Error("Invalid upload response from server");
  }

  return response as {
    uploads: Array<{
      error?: string;
      appwrite_file_id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      url: string;
    }>;
  };
}

export const storageService = {
  // Upload a file using the upload API
  async uploadFile(file: File, _userEmail: string) {
    const formData = new FormData();
    formData.append("files", file);

    const csrfToken = getCookie(CSRF_TOKEN_NAME);
    const response = await fetch("/api/upload-attachment", {
      method: "POST",
      headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Failed to upload file");
    }

    const result = getUploadResult(await response.json());
    const upload = result.uploads[0];

    if (!upload) {
      throw new Error("Upload response did not include any files");
    }

    if (upload.error) {
      throw new Error(upload.error);
    }

    return {
      fileId: upload.appwrite_file_id,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      fileType: upload.fileType,
      url: upload.url,
    };
  },

  // Get file URL - uses the server endpoint format
  getFileUrl(fileId: string) {
    const endpoint = getRequiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
    const projectId = getRequiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
    const bucketId = getRequiredEnv(
      "NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID",
    );

    return `${endpoint}/storage/buckets/${bucketId}/files/${encodeURIComponent(
      fileId,
    )}/view?project=${encodeURIComponent(projectId)}`;
  },

  // Delete is handled server-side, not available from client
  async deleteFile(_fileId: string) {
    clientLogger.warn("File deletion should be done server-side");
    return Promise.resolve();
  },
};
