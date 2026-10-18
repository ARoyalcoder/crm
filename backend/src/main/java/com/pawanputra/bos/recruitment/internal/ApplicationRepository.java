package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.recruitment.api.ApplicationStage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Application> findAllByOrganizationIdOrderByAppliedDateDesc(UUID organizationId);

    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    List<Application> findAllByJobIdOrderByAppliedDateDesc(UUID jobId);

    List<Application> findAllByJobIdAndStageOrderByAppliedDateDesc(UUID jobId, ApplicationStage stage);

    List<Application> findAllByCandidateIdOrderByAppliedDateDesc(UUID candidateId);

    long countByJobId(UUID jobId);

    /** One row per job that has applications: how many people applied. */
    @Query("select a.jobId as jobId, count(a) as total from Application a where a.organizationId = :organizationId group by a.jobId")
    List<JobApplicationCount> countByJob(UUID organizationId);

    interface JobApplicationCount {
        UUID getJobId();

        long getTotal();
    }
}
