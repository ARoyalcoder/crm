package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VendorDocumentService {

    private final VendorRepository vendors;
    private final VendorDocumentRepository documents;

    public VendorDocumentService(VendorRepository vendors, VendorDocumentRepository documents) {
        this.vendors = vendors;
        this.documents = documents;
    }

    public record DocumentCmd(
            String documentType,
            String fileName,
            String storageKey,
            String mimeType,
            Long fileSize) {
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<VendorDocument> listDocuments(UUID organizationId, UUID vendorId) {
        requireVendor(organizationId, vendorId);
        return documents.findAllByVendorIdOrderByCreatedAtDesc(vendorId);
    }

    // --- Mutations ---

    public VendorDocument addDocument(UUID organizationId, UUID vendorId, DocumentCmd cmd, String actor) {
        requireVendor(organizationId, vendorId);
        String type = cmd.documentType() != null ? cmd.documentType() : "OTHER";
        return documents.save(new VendorDocument(
                vendorId, type, cmd.fileName(), cmd.storageKey(), cmd.mimeType(), cmd.fileSize(), actor));
    }

    public void deleteDocument(UUID organizationId, UUID vendorId, UUID documentId) {
        requireVendor(organizationId, vendorId);
        VendorDocument doc = documents.findByIdAndVendorId(documentId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("VendorDocument", documentId));
        documents.delete(doc);
    }

    // --- Helpers ---

    private void requireVendor(UUID organizationId, UUID vendorId) {
        vendors.findByIdAndOrganizationId(vendorId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor", vendorId));
    }
}
