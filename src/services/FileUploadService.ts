// 📎 File Upload Service - Handles pre-signed URL uploads
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';

class FileUploadService {
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
  }

  /**
   * Get mime type from file extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Upload a file using pre-signed URL
   * @param fileUri Local file URI
   * @param fileName Original file name
   * @param fileType MIME type
   * @returns Public file URL
   */
  async uploadFile(fileUri: string, fileName: string, fileType?: string): Promise<string | null> {
    try {
      const mimeType = fileType || this.getMimeType(fileName);
      
      // Step 1: Get pre-signed upload URL from backend
      const uploadUrlResponse = await this.getUploadUrl(fileName, mimeType);
      if (!uploadUrlResponse) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileUrl } = uploadUrlResponse;

      // Step 2: Upload file to pre-signed URL
      const uploadSuccess = await this.uploadToPresignedUrl(fileUri, uploadUrl, mimeType);
      if (!uploadSuccess) {
        throw new Error('Failed to upload file');
      }

      console.log('✅ File uploaded successfully:', fileUrl);
      return fileUrl;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      return null;
    }
  }

  /**
   * Get pre-signed upload URL from backend
   */
  private async getUploadUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string } | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/files/upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename, contentType }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Get upload URL error:', errorText);
        throw new Error(`Failed to get upload URL: ${response.status}`);
      }

      const data = await response.json();
      return {
        uploadUrl: data.uploadUrl,
        fileUrl: data.fileUrl,
      };
    } catch (error) {
      console.error('❌ Error getting upload URL:', error);
      return null;
    }
  }

  /**
   * Upload file to pre-signed URL
   */
  private async uploadToPresignedUrl(fileUri: string, uploadUrl: string, contentType: string): Promise<boolean> {
    try {
      // Read file as blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload to pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload to presigned URL error:', errorText);
        throw new Error(`Failed to upload file: ${uploadResponse.status}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error uploading to presigned URL:', error);
      return false;
    }
  }

  /**
   * Upload multiple files
   * @param files Array of file objects { uri, name, type }
   * @returns Array of uploaded file URLs
   */
  async uploadMultipleFiles(files: { uri: string; name: string; type?: string }[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const url = await this.uploadFile(file.uri, file.name, file.type);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    return uploadedUrls;
  }
}

export default new FileUploadService();
