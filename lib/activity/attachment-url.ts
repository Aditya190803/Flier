export function getAttachmentUrl(attachment: {
  fileUrl?: string;
  appwrite_file_id?: string;
}) {
  if (attachment.appwrite_file_id) {
    return `/api/appwrite/attachments/${attachment.appwrite_file_id}`;
  }

  if (attachment.fileUrl) {
    const match = attachment.fileUrl.match(/\/files\/([^/]+)\//);
    if (match && match[1]) {
      return `/api/appwrite/attachments/${match[1]}`;
    }
  }

  return attachment.fileUrl || "#";
}
