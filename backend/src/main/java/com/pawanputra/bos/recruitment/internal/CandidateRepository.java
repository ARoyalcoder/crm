package com.pawanputra.bos.recruitment.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {

    Optional<Candidate> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Optional<Candidate> findByOrganizationIdAndEmail(UUID organizationId, String email);

    boolean existsByOrganizationIdAndEmail(UUID organizationId, String email);

    List<Candidate> findAllByOrganizationIdOrderByLastNameAscFirstNameAsc(UUID organizationId);

    @Query("select c from Candidate c where c.organizationId = :organizationId "
            + "and (lower(c.firstName) like lower(concat('%', :search, '%')) "
            + "or lower(c.lastName) like lower(concat('%', :search, '%')) "
            + "or lower(c.email) like lower(concat('%', :search, '%')))")
    List<Candidate> searchByOrganizationId(UUID organizationId, String search);
}
