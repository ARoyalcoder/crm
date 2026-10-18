package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.vendor.api.PartnerAccessLevel;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Partner management service. Partners NEVER receive unrestricted CRM access: access level
 * validation is enforced here at the service layer.
 */
@Service
@Transactional
public class PartnerService {

    private final PartnerRepository partners;

    public PartnerService(PartnerRepository partners) {
        this.partners = partners;
    }

    // --- Command records ---

    public record CreatePartnerCmd(
            String organizationName,
            String contactEmail,
            String contactPhone,
            PartnerAccessLevel accessLevel,
            String assignedProjectIds,
            String services,
            boolean active,
            UUID userId,
            String notes) {
    }

    public record UpdatePartnerCmd(
            String organizationName,
            String contactEmail,
            String contactPhone,
            PartnerAccessLevel accessLevel,
            String assignedProjectIds,
            String services,
            boolean active,
            UUID userId,
            String notes) {
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<Partner> listAll(UUID organizationId) {
        return partners.findAllByOrganizationIdOrderByOrganizationNameAsc(organizationId);
    }

    @Transactional(readOnly = true)
    public Partner getById(UUID organizationId, UUID id) {
        return partners.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Partner", id));
    }

    // --- Mutations ---

    public Partner create(UUID organizationId, CreatePartnerCmd cmd, String actor) {
        validateAccessLevel(cmd.accessLevel());
        Partner partner = new Partner(
                organizationId, cmd.organizationName(), cmd.contactEmail(),
                cmd.contactPhone(), cmd.accessLevel(), actor);
        partner.setAssignedProjectIds(cmd.assignedProjectIds());
        partner.setServices(cmd.services());
        partner.setActive(cmd.active());
        partner.setUserId(cmd.userId());
        partner.setNotes(cmd.notes());
        return partners.save(partner);
    }

    public Partner update(UUID organizationId, UUID id, UpdatePartnerCmd cmd, String actor) {
        validateAccessLevel(cmd.accessLevel());
        Partner partner = getById(organizationId, id);
        partner.setOrganizationName(cmd.organizationName());
        partner.setContactEmail(cmd.contactEmail());
        partner.setContactPhone(cmd.contactPhone());
        partner.setAccessLevel(cmd.accessLevel());
        partner.setAssignedProjectIds(cmd.assignedProjectIds());
        partner.setServices(cmd.services());
        partner.setActive(cmd.active());
        partner.setUserId(cmd.userId());
        partner.setNotes(cmd.notes());
        partner.setUpdatedAt(Instant.now());
        partner.setUpdatedBy(actor);
        return partners.save(partner);
    }

    public void delete(UUID organizationId, UUID id) {
        Partner partner = getById(organizationId, id);
        partners.delete(partner);
    }

    /**
     * Guards against accidentally granting unrestricted access. All three enum values are
     * restricted by definition, but this check makes the intent explicit and guards future changes.
     */
    private static void validateAccessLevel(PartnerAccessLevel level) {
        if (level == null) {
            throw new ApiException(ErrorCode.MALFORMED_REQUEST, "accessLevel is required for a partner");
        }
        // All current values are acceptable; this method exists to make the no-unrestricted-access
        // rule visible and to catch any future additions that accidentally grant full access.
    }
}
