package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.recruitment.api.JobStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class JobOpeningService {

    private final JobOpeningRepository jobs;
    private final ApplicationRepository applications;

    public JobOpeningService(JobOpeningRepository jobs, ApplicationRepository applications) {
        this.jobs = jobs;
        this.applications = applications;
    }

    public record JobDetails(
            String title,
            String department,
            String location,
            String description,
            String requirements,
            Integer minExperienceYears,
            BigDecimal minSalary,
            BigDecimal maxSalary,
            JobStatus status,
            LocalDate postedDate,
            LocalDate closingDate) {
    }

    public List<JobOpening> listAll(UUID organizationId, JobStatus status) {
        if (status != null) {
            return jobs.findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(organizationId, status);
        }
        return jobs.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    public JobOpening getById(UUID organizationId, UUID id) {
        return jobs.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("JobOpening", id));
    }

    @Transactional
    public JobOpening create(UUID organizationId, JobDetails details) {
        JobOpening job = new JobOpening(organizationId);
        apply(job, details);
        return jobs.save(job);
    }

    @Transactional
    public JobOpening update(UUID organizationId, UUID id, JobDetails details) {
        JobOpening job = getById(organizationId, id);
        apply(job, details);
        return jobs.save(job);
    }

    @Transactional
    public void delete(UUID organizationId, UUID id) {
        JobOpening job = getById(organizationId, id);
        // The people who applied are on record against this job, so it is closed rather than removed.
        if (applications.countByJobId(id) > 0) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "This job has applications, so it cannot be deleted. Close it instead.");
        }
        jobs.delete(job);
    }

    private void apply(JobOpening job, JobDetails d) {
        if (d.minSalary() != null && d.maxSalary() != null && d.minSalary().compareTo(d.maxSalary()) > 0) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "The minimum salary cannot be more than the maximum salary");
        }
        job.setTitle(d.title());
        job.setDepartment(d.department());
        job.setLocation(d.location());
        job.setDescription(d.description());
        job.setRequirements(d.requirements());
        job.setMinExperienceYears(d.minExperienceYears());
        job.setMinSalary(d.minSalary());
        job.setMaxSalary(d.maxSalary());
        if (d.status() != null) {
            job.setStatus(d.status());
        }
        job.setPostedDate(d.postedDate());
        job.setClosingDate(d.closingDate());
    }
}
