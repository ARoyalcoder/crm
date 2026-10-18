package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import com.pawanputra.bos.vendor.api.VendorStatus;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VendorService {

    private final VendorRepository vendors;
    private final VendorScoreRepository scores;

    public VendorService(VendorRepository vendors, VendorScoreRepository scores) {
        this.vendors = vendors;
        this.scores = scores;
    }

    // --- Command records ---

    public record CreateVendorCmd(
            String companyName,
            String contactEmail,
            String contactPhone,
            String address,
            String services,
            Integer paymentTermsDays,
            VendorStatus status,
            String notes) {
    }

    public record UpdateVendorCmd(
            String companyName,
            String contactEmail,
            String contactPhone,
            String address,
            String services,
            Integer paymentTermsDays,
            VendorStatus status,
            String notes) {
    }

    /** Per-category score plus overall average. */
    public record ScorecardSummary(
            Map<VendorRatingCategory, Integer> categoryScores,
            double overallAverage) {
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<Vendor> listAll(UUID organizationId, VendorStatus statusFilter) {
        if (statusFilter != null) {
            return vendors.findAllByOrganizationIdAndStatusOrderByCompanyNameAsc(organizationId, statusFilter);
        }
        return vendors.findAllByOrganizationIdOrderByCompanyNameAsc(organizationId);
    }

    @Transactional(readOnly = true)
    public Vendor getById(UUID organizationId, UUID id) {
        return vendors.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor", id));
    }

    @Transactional(readOnly = true)
    public ScorecardSummary getScorecardSummary(UUID organizationId, UUID vendorId) {
        // Verify vendor belongs to org
        getById(organizationId, vendorId);

        List<VendorScore> vendorScores = scores.findAllByVendorId(vendorId);
        Map<VendorRatingCategory, Integer> categoryScores = new EnumMap<>(VendorRatingCategory.class);
        for (VendorScore s : vendorScores) {
            categoryScores.put(s.getCategory(), s.getScore());
        }
        OptionalDouble avg = vendorScores.stream().mapToInt(VendorScore::getScore).average();
        return new ScorecardSummary(categoryScores, avg.orElse(0.0));
    }

    // --- Mutations ---

    public Vendor create(UUID organizationId, CreateVendorCmd cmd, String actor) {
        Vendor vendor = new Vendor(organizationId, cmd.companyName(), cmd.contactEmail(), cmd.contactPhone(), actor);
        vendor.setAddress(cmd.address());
        vendor.setServices(cmd.services());
        vendor.setPaymentTermsDays(cmd.paymentTermsDays());
        if (cmd.status() != null) {
            vendor.setStatus(cmd.status());
        }
        vendor.setNotes(cmd.notes());
        return vendors.save(vendor);
    }

    public Vendor update(UUID organizationId, UUID id, UpdateVendorCmd cmd, String actor) {
        Vendor vendor = getById(organizationId, id);
        vendor.setCompanyName(cmd.companyName());
        vendor.setContactEmail(cmd.contactEmail());
        vendor.setContactPhone(cmd.contactPhone());
        vendor.setAddress(cmd.address());
        vendor.setServices(cmd.services());
        vendor.setPaymentTermsDays(cmd.paymentTermsDays());
        if (cmd.status() != null) {
            vendor.setStatus(cmd.status());
        }
        vendor.setNotes(cmd.notes());
        vendor.setUpdatedAt(Instant.now());
        vendor.setUpdatedBy(actor);
        return vendors.save(vendor);
    }

    public void delete(UUID organizationId, UUID id) {
        Vendor vendor = getById(organizationId, id);
        vendors.delete(vendor);
    }

    /** Upserts a score for the given category: creates if not present, updates if it is. */
    public VendorScore addScore(UUID organizationId, UUID vendorId,
                                VendorRatingCategory category, int score,
                                String notes, UUID reviewedBy) {
        // Verify vendor belongs to org
        getById(organizationId, vendorId);

        VendorScore existing = scores.findByVendorIdAndCategory(vendorId, category).orElse(null);
        if (existing != null) {
            existing.setScore(score);
            existing.setNotes(notes);
            existing.setReviewedBy(reviewedBy);
            existing.setScoredAt(Instant.now());
            return scores.save(existing);
        }
        return scores.save(new VendorScore(vendorId, organizationId, category, score, reviewedBy, notes));
    }
}
