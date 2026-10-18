package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CandidateService {

    private final CandidateRepository candidates;

    public CandidateService(CandidateRepository candidates) {
        this.candidates = candidates;
    }

    public record CandidateDetails(
            String firstName,
            String lastName,
            String email,
            String phone,
            String location,
            Integer experienceYears,
            BigDecimal currentSalary,
            BigDecimal expectedSalary,
            Integer noticePeriodDays,
            String resumeStorageKey,
            String resumeFileName,
            String linkedInUrl,
            String notes) {
    }

    public List<Candidate> listAll(UUID organizationId, String search) {
        if (search != null && !search.isBlank()) {
            return candidates.searchByOrganizationId(organizationId, search.trim());
        }
        return candidates.findAllByOrganizationIdOrderByLastNameAscFirstNameAsc(organizationId);
    }

    public Candidate getById(UUID organizationId, UUID id) {
        return candidates.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", id));
    }

    @Transactional
    public Candidate create(UUID organizationId, CandidateDetails details) {
        if (candidates.existsByOrganizationIdAndEmail(organizationId, details.email())) {
            throw new ApiException(ErrorCode.CONFLICT,
                    "A candidate with email '%s' already exists".formatted(details.email()));
        }
        Candidate candidate = new Candidate(organizationId);
        apply(candidate, details);
        return candidates.save(candidate);
    }

    @Transactional
    public Candidate update(UUID organizationId, UUID id, CandidateDetails details) {
        Candidate candidate = getById(organizationId, id);
        // If email is changing, check for conflict
        if (!candidate.getEmail().equalsIgnoreCase(details.email())) {
            if (candidates.existsByOrganizationIdAndEmail(organizationId, details.email())) {
                throw new ApiException(ErrorCode.CONFLICT,
                        "A candidate with email '%s' already exists".formatted(details.email()));
            }
        }
        apply(candidate, details);
        return candidates.save(candidate);
    }

    private void apply(Candidate c, CandidateDetails d) {
        c.setFirstName(d.firstName());
        c.setLastName(d.lastName());
        c.setEmail(d.email());
        c.setPhone(d.phone());
        c.setLocation(d.location());
        c.setExperienceYears(d.experienceYears());
        c.setCurrentSalary(d.currentSalary());
        c.setExpectedSalary(d.expectedSalary());
        c.setNoticePeriodDays(d.noticePeriodDays());
        c.setResumeStorageKey(d.resumeStorageKey());
        c.setResumeFileName(d.resumeFileName());
        c.setLinkedInUrl(d.linkedInUrl());
        c.setNotes(d.notes());
    }
}
