import { admin } from "./firebase-service";

const BUCKET_NAME = "umpiluzi-fire-permits.firebasestorage.app";

const bucket = () => admin.storage().bucket(BUCKET_NAME);

export class StorageService {
  static buildPath(documentId: string, fileName: string): string {
    // Strip any path separators from filename to keep storage keys flat.
    const safeName = fileName.replace(/[\\/]+/g, "_");
    return `documents/${documentId}/${safeName}`;
  }

  static async uploadDocument(params: {
    documentId: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }): Promise<string> {
    const path = StorageService.buildPath(params.documentId, params.fileName);
    const file = bucket().file(path);
    await file.save(params.buffer, {
      contentType: params.contentType,
      resumable: false,
      metadata: {
        contentType: params.contentType,
        cacheControl: "private, max-age=0",
      },
    });
    return path;
  }

  static async getSignedDownloadUrl(
    storagePath: string,
    fileName: string,
    contentType: string,
    expiresInSeconds = 15 * 60
  ): Promise<string> {
    const file = bucket().file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("File not found in storage");
    }
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInSeconds * 1000,
      responseDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
      responseType: contentType,
    });
    return url;
  }

  static async deleteDocument(storagePath: string): Promise<void> {
    try {
      await bucket().file(storagePath).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error("Error deleting storage object:", error);
    }
  }
}
