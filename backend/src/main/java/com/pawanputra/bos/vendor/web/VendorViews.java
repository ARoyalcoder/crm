package com.pawanputra.bos.vendor.web;

import com.pawanputra.bos.vendor.api.PartnerAccessLevel;
import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import com.pawanputra.bos.vendor.api.VendorStatus;
import com.pawanputra.bos.vendor.internal.Partner;
import com.pawanputra.bos.vendor.internal.Vendor;
import com.pawanputra.bos.vendor.internal.VendorContact;
import com.pawanputra.bos.vendor.internal.VendorDocument;
import com.pawanputra.bos.vendor.internal.VendorScore;
import com.pawanputra.bos.vendor.internal.VendorService.ScorecardSummary;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Immutable read-model records returned by the vendor and partner controllers. */
public final class VendorViews {

    private VendorViews() {
    }

    public record VendorView(
            UUID id,
            UUID organizationId,
            String companyName,
            String contactEmail,
            String contactPhone,
            String address,
            String services,
            Integer paymentTermsDays,
            VendorStatus status,
            String notes,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version) {

        static VendorView from(Vendor v) {
            return new VendorView(
                    v.getId(), v.getOrganizationId(), v.getCompanyName(),
                    v.getContactEmail(), v.getContactPhone(), v.getAddress(),
                    v.getServices(), v.getPaymentTermsDays(), v.getStatus(),
                    v.getNotes(), v.getCreatedAt(), v.getCreatedBy(),
                    v.getUpdatedAt(), v.getUpdatedBy(), v.getVersion());
        }
    }

    public record VendorContactView(
            UUID id,
            UUID vendorId,
            String name,
            String email,
            String phone,
            String designation,
            boolean primaryContact,
            Instant createdAt,
            Instant updatedAt) {

        static VendorContactView from(VendorContact c) {
            return new VendorContactView(
                    c.getId(), c.getVendorId(), c.getName(), c.getEmail(),
                    c.getPhone(), c.getDesignation(), c.isPrimaryContact(),
                    c.getCreatedAt(), c.getUpdatedAt());
        }
    }

    public record VendorDocumentView(
            UUID id,
            UUID vendorId,
            String documentType,
            String fileName,
            String storageKey,
            String mimeType,
            Long fileSize,
            String uploadedBy,
            Instant createdAt) {

        static VendorDocumentView from(VendorDocument d) {
            return new VendorDocumentView(
                    d.getId(), d.getVendorId(), d.getDocumentType(), d.getFileName(),
                    d.getStorageKey(), d.getMimeType(), d.getFileSize(),
                    d.getUploadedBy(), d.getCreatedAt());
        }
    }

    public record VendorScoreView(
            UUID id,
            UUID vendorId,
            VendorRatingCategory category,
            int score,
            UUID reviewedBy,
            String notes,
            Instant scoredAt) {

        static VendorScoreView from(VendorScore s) {
            return new VendorScoreView(
                    s.getId(), s.getVendorId(), s.getCategory(),
                    s.getScore(), s.getReviewedBy(), s.getNotes(), s.getScoredAt());
        }
    }

    public record ScorecardView(
            Map<VendorRatingCategory, Integer> categoryScores,
            double overallAverage) {

        static ScorecardView from(ScorecardSummary summary) {
            return new ScorecardView(summary.categoryScores(), summary.overallAverage());
        }
    }

    public record PartnerView(
            UUID id,
            UUID organizationId,
            String organizationName,
            String contactEmail,
            String contactPhone,
            PartnerAccessLevel accessLevel,
            String assignedProjectIds,
            String services,
            boolean active,
            UUID userId,
            String notes,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version) {

        static PartnerView from(Partner p) {
            return new PartnerView(
                    p.getId(), p.getOrganizationId(), p.getOrganizationName(),
                    p.getContactEmail(), p.getContactPhone(), p.getAccessLevel(),
                    p.getAssignedProjectIds(), p.getServices(), p.isActive(),
                    p.getUserId(), p.getNotes(), p.getCreatedAt(), p.getCreatedBy(),
                    p.getUpdatedAt(), p.getUpdatedBy(), p.getVersion());
        }
    }
}
