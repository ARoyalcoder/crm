package com.pawanputra.bos.vendor.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import com.pawanputra.bos.vendor.api.VendorStatus;
import com.pawanputra.bos.vendor.internal.Vendor;
import com.pawanputra.bos.vendor.internal.VendorContactService;
import com.pawanputra.bos.vendor.internal.VendorDocumentService;
import com.pawanputra.bos.vendor.internal.VendorScore;
import com.pawanputra.bos.vendor.internal.VendorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Vendors and everything attached to them: contacts, documents and scorecard.
 * Organization context always comes from the access token.
 */
@RestController
@RequestMapping(ApiPaths.V1)
@Tag(name = "Vendors")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class VendorController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.VENDOR_VIEW   + "')";
    private static final String CAN_CREATE = "hasAuthority('" + Permissions.VENDOR_CREATE + "')";
    private static final String CAN_UPDATE = "hasAuthority('" + Permissions.VENDOR_UPDATE + "')";
    private static final String CAN_DELETE = "hasAuthority('" + Permissions.VENDOR_DELETE + "')";
    private static final String CAN_SCORE  = "hasAuthority('" + Permissions.VENDOR_SCORE  + "')";

    private final VendorService vendorService;
    private final VendorContactService contactService;
    private final VendorDocumentService documentService;

    public VendorController(VendorService vendorService,
                            VendorContactService contactService,
                            VendorDocumentService documentService) {
        this.vendorService = vendorService;
        this.contactService = contactService;
        this.documentService = documentService;
    }

    // ------------------------------------------------------------------ vendors

    @GetMapping("/vendors")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List vendors; filter by status. Requires VENDOR_VIEW.")
    public List<VendorViews.VendorView> list(@RequestParam(required = false) VendorStatus status) {
        UUID orgId = CurrentUser.require().organizationId();
        return vendorService.listAll(orgId, status).stream()
                .map(VendorViews.VendorView::from)
                .collect(Collectors.toList());
    }

    @PostMapping("/vendors")
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Create a vendor. Requires VENDOR_CREATE.")
    public ResponseEntity<VendorViews.VendorView> create(@Valid @RequestBody VendorDtos.VendorRequest request) {
        CurrentUser user = CurrentUser.require();
        Vendor created = vendorService.create(user.organizationId(), request.toCreateCmd(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/vendors/" + created.getId()))
                .body(VendorViews.VendorView.from(created));
    }

    @GetMapping("/vendors/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a vendor by ID. Requires VENDOR_VIEW.")
    public VendorViews.VendorView get(@PathVariable UUID id) {
        return VendorViews.VendorView.from(vendorService.getById(CurrentUser.require().organizationId(), id));
    }

    @PutMapping("/vendors/{id}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Update a vendor. Requires VENDOR_UPDATE.")
    public VendorViews.VendorView update(@PathVariable UUID id, @Valid @RequestBody VendorDtos.VendorRequest request) {
        CurrentUser user = CurrentUser.require();
        return VendorViews.VendorView.from(vendorService.update(user.organizationId(), id, request.toUpdateCmd(), user.email()));
    }

    @DeleteMapping("/vendors/{id}")
    @PreAuthorize(CAN_DELETE)
    @Operation(summary = "Delete a vendor. Requires VENDOR_DELETE.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        vendorService.delete(CurrentUser.require().organizationId(), id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ contacts

    @GetMapping("/vendors/{id}/contacts")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List contacts for a vendor. Requires VENDOR_VIEW.")
    public List<VendorViews.VendorContactView> listContacts(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return contactService.listContacts(orgId, id).stream()
                .map(VendorViews.VendorContactView::from)
                .collect(Collectors.toList());
    }

    @PostMapping("/vendors/{id}/contacts")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Add a contact to a vendor. Requires VENDOR_UPDATE.")
    public ResponseEntity<VendorViews.VendorContactView> addContact(
            @PathVariable UUID id,
            @Valid @RequestBody VendorDtos.VendorContactRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return ResponseEntity.status(201)
                .body(VendorViews.VendorContactView.from(contactService.addContact(orgId, id, request.toCmd())));
    }

    @PutMapping("/vendor-contacts/{contactId}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Update a vendor contact. Requires VENDOR_UPDATE.")
    public VendorViews.VendorContactView updateContact(
            @PathVariable UUID contactId,
            @RequestParam UUID vendorId,
            @Valid @RequestBody VendorDtos.VendorContactRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return VendorViews.VendorContactView.from(
                contactService.updateContact(orgId, vendorId, contactId, request.toCmd()));
    }

    @DeleteMapping("/vendor-contacts/{contactId}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Delete a vendor contact. Requires VENDOR_UPDATE.")
    public ResponseEntity<Void> deleteContact(
            @PathVariable UUID contactId,
            @RequestParam UUID vendorId) {
        UUID orgId = CurrentUser.require().organizationId();
        contactService.deleteContact(orgId, vendorId, contactId);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ scorecard

    @GetMapping("/vendors/{id}/scorecard")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get scorecard for a vendor: all category scores and overall average. "
            + "Categories without a score are absent from the map (show as 'Not rated'). Requires VENDOR_VIEW.")
    public VendorViews.ScorecardView scorecard(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return VendorViews.ScorecardView.from(vendorService.getScorecardSummary(orgId, id));
    }

    @PostMapping("/vendors/{id}/scores")
    @PreAuthorize(CAN_SCORE)
    @Operation(summary = "Add or update a scorecard rating for a category. "
            + "One score per category is kept (upsert). Requires VENDOR_SCORE.")
    public VendorViews.VendorScoreView addScore(
            @PathVariable UUID id,
            @Valid @RequestBody VendorDtos.VendorScoreRequest request) {
        CurrentUser user = CurrentUser.require();
        VendorScore score = vendorService.addScore(
                user.organizationId(), id,
                request.category(), request.score(),
                request.notes(), user.id());
        return VendorViews.VendorScoreView.from(score);
    }

    // ------------------------------------------------------------------ documents

    @GetMapping("/vendors/{id}/documents")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List documents attached to a vendor. Requires VENDOR_VIEW.")
    public List<VendorViews.VendorDocumentView> listDocuments(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return documentService.listDocuments(orgId, id).stream()
                .map(VendorViews.VendorDocumentView::from)
                .collect(Collectors.toList());
    }

    @PostMapping("/vendors/{id}/documents")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Register a document against a vendor (metadata only; file upload is separate). "
            + "Requires VENDOR_UPDATE.")
    public ResponseEntity<VendorViews.VendorDocumentView> addDocument(
            @PathVariable UUID id,
            @Valid @RequestBody VendorDtos.VendorDocumentRequest request) {
        CurrentUser user = CurrentUser.require();
        return ResponseEntity.status(201).body(VendorViews.VendorDocumentView.from(
                documentService.addDocument(user.organizationId(), id, request.toCmd(), user.email())));
    }

    @DeleteMapping("/vendor-documents/{documentId}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Delete a vendor document. Requires VENDOR_UPDATE.")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID documentId,
            @RequestParam UUID vendorId) {
        UUID orgId = CurrentUser.require().organizationId();
        documentService.deleteDocument(orgId, vendorId, documentId);
        return ResponseEntity.noContent().build();
    }
}
