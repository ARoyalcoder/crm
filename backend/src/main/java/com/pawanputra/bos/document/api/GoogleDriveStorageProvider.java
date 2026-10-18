package com.pawanputra.bos.document.api;

/**
 * Future integration point for Google Drive as an alternative document storage backend.
 *
 * <p>This interface documents the contract that a Google Drive adapter must satisfy. It is
 * intentionally left unimplemented; all current storage is handled by
 * {@link com.pawanputra.bos.platform.storage.ObjectStorage} (S3/MinIO).
 *
 * <p>When Google Drive integration is added:
 * <ol>
 *   <li>Implement this interface backed by the Google Drive SDK.</li>
 *   <li>Expose it as a Spring bean and inject it alongside {@code ObjectStorage} in
 *       {@code DocumentService}.</li>
 *   <li>Add a {@code storageBackend} field to {@code DocumentRecord} to record which backend holds
 *       each file.</li>
 * </ol>
 */
public interface GoogleDriveStorageProvider {

    /**
     * Upload a file to Google Drive and return the newly created file ID.
     *
     * @param content     the file bytes
     * @param name        the file name as it should appear in Drive
     * @param mimeType    MIME type of the content
     * @param folderId    the Drive folder to place the file in ({@code null} for root)
     * @return the Google Drive file ID of the uploaded file
     */
    String uploadFile(byte[] content, String name, String mimeType, String folderId);

    /**
     * Download a file from Google Drive by its file ID.
     *
     * @param fileId the Google Drive file ID
     * @return the raw file bytes
     */
    byte[] downloadFile(String fileId);

    /**
     * Create a folder inside the given parent and return its Drive folder ID.
     *
     * @param name           the folder name
     * @param parentFolderId the parent folder ID ({@code null} for root)
     * @return the new folder's Drive ID
     */
    String createFolder(String name, String parentFolderId);

    /**
     * Permanently delete a file or folder from Google Drive.
     *
     * @param fileId the Drive file or folder ID to delete
     */
    void deleteFile(String fileId);
}
