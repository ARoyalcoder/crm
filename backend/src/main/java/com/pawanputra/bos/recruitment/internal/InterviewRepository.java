package com.pawanputra.bos.recruitment.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    Optional<Interview> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Interview> findAllByApplicationIdOrderByScheduledAtAsc(UUID applicationId);
}
