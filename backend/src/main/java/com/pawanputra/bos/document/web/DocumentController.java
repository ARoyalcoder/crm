package com.pawanputra.bos.document.web;

import com.pawanputra.bos.document.api.DocumentCategory;
import com.pawanputra.bos.document.api.DocumentEntityType;
import com.pawanputra.bos.document.internal.DocumentDtos;
import com.pawanputra.bos.document.internal.DocumentRecord;
import com.pawanputra.bos.document.internal.DocumentService;
import com.pawanputra.bos.document.internal.DocumentVersion;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.identity.api.UserDirectory;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiPaths.V1 + "/documents")
@Tag(name = "Documents")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class DocumentController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.DOCUMENT_VIEW + "')";
    private static final String CAN_UPLOAD = "hasAuthority('" + Permissions.DOCUMENT_UPLOAD + "')";
    private static final String CAN_DELETE = "hasAuthority('" + Permissions.DOCUMENT_DELETE + "')";

    private final DocumentService service;
    private final UserDirectory users;

    public DocumentController(DocumentService service, UserDirectory users) {
        this.service = service;
        this.users = users;
    }

    /** Who uploaded what, by name: a list of documents should say "Priya Shah", not show a user id. */
    private Map<UUID, String> uploaderNames(UUID organizationId, Collection<UUID> uploaderIds) {
        Map<UUID, String> names = new HashMap<>();
        users.findAll(organizationId, uploaderIds.stream().distinct().toList()).forEach((id, user) -> names.put(id, user.fullName()));
        return names;
    }

    private String uploaderName(UUID organizationId, UUID uploaderId) {
        return uploaderNames(organizationId, List.of(uploaderId)).get(uploaderId);
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(CAN_UPLOAD)
    @Operation(summary = "Upload a document and attach it to a business entity")
    public ResponseEntity<DocumentDtos.DocumentView> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("entityType") DocumentEntityType entityType,
            @RequestParam("entityId") UUID entityId,
            @RequestParam("category") DocumentCategory category,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "tags", required = false) String tags) {
        CurrentUser user = CurrentUser.require();
        DocumentRecord saved = service.upload(
                entityType, entityId, file, category, title, description, tags,
                user.id(), user.organizationId());
        DocumentDtos.DocumentView view = DocumentDtos.toView(saved, uploaderName(user.organizationId(), saved.getUploadedBy()));
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/documents/" + view.id()))
                .body(view);
    }

    @PostMapping(path = "/{id}/version", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(CAN_UPLOAD)
    @Operation(summary = "Upload a new version of an existing document")
    public DocumentDtos.DocumentView uploadNewVersion(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "notes", required = false) String notes) {
        CurrentUser user = CurrentUser.require();
        DocumentRecord updated = service.uploadNewVersion(id, file, notes, user.id(), user.organizationId());
        return DocumentDtos.toView(updated, uploaderName(user.organizationId(), updated.getUploadedBy()));
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get document metadata by ID")
    public DocumentDtos.DocumentView getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        DocumentRecord found = service.getById(id, user.organizationId());
        return DocumentDtos.toView(found, uploaderName(user.organizationId(), found.getUploadedBy()));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a presigned download URL for the document (valid for 15 minutes)")
    public DocumentDtos.DownloadUrlView download(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return service.generateDownloadUrl(id, user.organizationId());
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all documents attached to a specific entity")
    public List<DocumentDtos.DocumentView> listByEntity(
            @PathVariable DocumentEntityType entityType,
            @PathVariable UUID entityId) {
        CurrentUser user = CurrentUser.require();
        List<DocumentRecord> found = service.listByEntity(entityType, entityId, user.organizationId());
        Map<UUID, String> names = uploaderNames(user.organizationId(), found.stream().map(DocumentRecord::getUploadedBy).toList());
        return found.stream().map(record -> DocumentDtos.toView(record, names.get(record.getUploadedBy()))).toList();
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Browse all documents in the organisation, with optional entity-type filter")
    public List<DocumentDtos.DocumentListItem> listAll(
            @RequestParam(value = "entityType", required = false) DocumentEntityType entityType) {
        CurrentUser user = CurrentUser.require();
        List<DocumentRecord> records = entityType != null
                ? service.listByOrganizationAndEntityType(entityType, user.organizationId())
                : service.listByOrganization(user.organizationId());
        return DocumentDtos.toListItems(records, uploaderNames(user.organizationId(), records.stream().map(DocumentRecord::getUploadedBy).toList()));
    }

    @GetMapping("/mine")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all documents uploaded by the current user")
    public List<DocumentDtos.DocumentListItem> listMine() {
        CurrentUser user = CurrentUser.require();
        List<DocumentRecord> mine = service.listByUploader(user.id(), user.organizationId());
        return DocumentDtos.toListItems(mine, uploaderNames(user.organizationId(), List.of(user.id())));
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get version history for a document")
    public List<DocumentDtos.DocumentVersionView> versionHistory(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        List<DocumentVersion> versions = service.getVersionHistory(id, user.organizationId());
        Map<UUID, String> names = uploaderNames(user.organizationId(), versions.stream().map(DocumentVersion::getUploadedBy).toList());
        return versions.stream().map(version -> DocumentDtos.toVersionView(version, names.get(version.getUploadedBy()))).toList();
    }

    @GetMapping("/storage-summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get total document count and storage usage for the organisation")
    public DocumentDtos.StorageSummary storageSummary() {
        CurrentUser user = CurrentUser.require();
        return service.getStorageSummary(user.organizationId());
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_DELETE)
    @Operation(summary = "Soft-delete a document (file is retained in storage for the purge job)")
    public void delete(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        service.delete(id, user.organizationId());
    }
}
