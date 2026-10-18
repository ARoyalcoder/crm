package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.recruitment.api.JobStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobOpeningRepository extends JpaRepository<JobOpening, UUID> {

    Optional<JobOpening> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<JobOpening> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<JobOpening> findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(UUID organizationId, JobStatus status);
}
