package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.identity.api.UserDirectory;
import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.recruitment.api.ApplicationStage;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ApplicationService {

    /**
     * Valid forward progression: APPLIED→SCREENING→SHORTLISTED→INTERVIEW→SELECTED→HIRED.
     * REJECTED can happen from any stage (and is handled separately via reject()).
     */
    private static final List<ApplicationStage> PROGRESSION = List.of(
            ApplicationStage.APPLIED,
            ApplicationStage.SCREENING,
            ApplicationStage.SHORTLISTED,
            ApplicationStage.INTERVIEW,
            ApplicationStage.SELECTED,
            ApplicationStage.HIRED);

    private final ApplicationRepository applications;
    private final JobOpeningRepository jobs;
    private final CandidateRepository candidates;
    private final InterviewRepository interviews;
    private final UserDirectory users;

    public ApplicationService(
            ApplicationRepository applications,
            JobOpeningRepository jobs,
            CandidateRepository candidates,
            InterviewRepository interviews,
            UserDirectory users) {
        this.applications = applications;
        this.jobs = jobs;
        this.candidates = candidates;
        this.interviews = interviews;
        this.users = users;
    }

    public record CreateApplicationCmd(
            UUID jobId,
            UUID candidateId,
            LocalDate appliedDate,
            UUID assignedToUserId,
            String stageNotes) {
    }

    /** Application enriched with its candidate, job, and interviews. */
    public record ApplicationDetail(
            Application application,
            Candidate candidate,
            JobOpening job,
            List<Interview> interviewList) {
    }

    public Application getById(UUID organizationId, UUID id) {
        return applications.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", id));
    }

    public ApplicationDetail getWithDetails(UUID organizationId, UUID id) {
        Application app = getById(organizationId, id);
        Candidate candidate = candidates.findById(app.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", app.getCandidateId()));
        JobOpening job = jobs.findById(app.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("JobOpening", app.getJobId()));
        List<Interview> interviewList = interviews.findAllByApplicationIdOrderByScheduledAtAsc(id);
        return new ApplicationDetail(app, candidate, job, interviewList);
    }

    public List<Application> listByJob(UUID jobId, ApplicationStage stage) {
        if (stage != null) {
            return applications.findAllByJobIdAndStageOrderByAppliedDateDesc(jobId, stage);
        }
        return applications.findAllByJobIdOrderByAppliedDateDesc(jobId);
    }

    public List<Application> listByCandidate(UUID candidateId) {
        return applications.findAllByCandidateIdOrderByAppliedDateDesc(candidateId);
    }

    /** The names to show beside applications: candidates and jobs, looked up together rather than one row at a time. */
    public record Labels(Map<UUID, String> candidateNames, Map<UUID, String> jobTitles) {

        public String candidate(UUID candidateId) {
            return candidateNames.get(candidateId);
        }

        public String job(UUID jobId) {
            return jobTitles.get(jobId);
        }
    }

    /** Anything that belongs to another organization is left unnamed. */
    public Labels labelsFor(UUID organizationId, Collection<Application> found) {
        Set<UUID> candidateIds = new HashSet<>();
        Set<UUID> jobIds = new HashSet<>();
        for (Application application : found) {
            candidateIds.add(application.getCandidateId());
            jobIds.add(application.getJobId());
        }
        Map<UUID, String> candidateNames = new HashMap<>();
        candidates.findAllById(candidateIds).stream()
                .filter(candidate -> organizationId.equals(candidate.getOrganizationId()))
                .forEach(candidate -> candidateNames.put(candidate.getId(), candidate.getFullName()));
        Map<UUID, String> jobTitles = new HashMap<>();
        jobs.findAllById(jobIds).stream()
                .filter(job -> organizationId.equals(job.getOrganizationId()))
                .forEach(job -> jobTitles.put(job.getId(), job.getTitle()));
        return new Labels(candidateNames, jobTitles);
    }

    public List<Application> listAll(UUID organizationId) {
        return applications.findAllByOrganizationIdOrderByAppliedDateDesc(organizationId);
    }

    /** How many people applied to each job; a job nobody applied to is simply absent. */
    public Map<UUID, Long> countsByJob(UUID organizationId) {
        Map<UUID, Long> counts = new HashMap<>();
        applications.countByJob(organizationId).forEach(row -> counts.put(row.getJobId(), row.getTotal()));
        return counts;
    }

    public long countForJob(UUID jobId) {
        return applications.countByJobId(jobId);
    }

    @Transactional
    public Application create(UUID organizationId, CreateApplicationCmd cmd) {
        // Verify job belongs to org
        jobs.findByIdAndOrganizationId(cmd.jobId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("JobOpening", cmd.jobId()));
        // Verify candidate belongs to org
        candidates.findByIdAndOrganizationId(cmd.candidateId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", cmd.candidateId()));
        // Enforce unique (job, candidate)
        if (applications.existsByJobIdAndCandidateId(cmd.jobId(), cmd.candidateId())) {
            throw new ApiException(ErrorCode.CONFLICT,
                    "This candidate has already applied to this job");
        }
        // Whoever looks after the application must be someone who can sign in to this organization.
        if (cmd.assignedToUserId() != null
                && users.find(organizationId, cmd.assignedToUserId()).filter(UserDirectory.UserSummary::active).isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Choose an active person from your organization to look after this application");
        }
        Application application = new Application(organizationId, cmd.jobId(), cmd.candidateId());
        if (cmd.appliedDate() != null) {
            application.setAppliedDate(cmd.appliedDate());
        }
        application.setAssignedToUserId(cmd.assignedToUserId());
        application.setStageNotes(cmd.stageNotes());
        return applications.save(application);
    }

    @Transactional
    public Application advanceStage(UUID organizationId, UUID id, ApplicationStage newStage, String notes) {
        Application app = getById(organizationId, id);
        ApplicationStage current = app.getStage();
        if (current == ApplicationStage.REJECTED) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A rejected application cannot advance to another stage");
        }
        if (current == ApplicationStage.HIRED) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A hired application cannot be changed");
        }
        int currentIdx = PROGRESSION.indexOf(current);
        int newIdx = PROGRESSION.indexOf(newStage);
        if (newIdx <= currentIdx) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Cannot move backwards in the recruitment pipeline (current: %s, requested: %s)"
                            .formatted(current, newStage));
        }
        app.setStage(newStage);
        app.setStageNotes(notes);
        return applications.save(app);
    }

    @Transactional
    public Application hire(UUID organizationId, UUID id) {
        Application app = getById(organizationId, id);
        if (app.getStage() != ApplicationStage.SELECTED) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Only a SELECTED application can be hired (current stage: %s)".formatted(app.getStage()));
        }
        app.setStage(ApplicationStage.HIRED);
        return applications.save(app);
    }

    @Transactional
    public Application reject(UUID organizationId, UUID id, String reason) {
        Application app = getById(organizationId, id);
        if (app.getStage() == ApplicationStage.HIRED) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A hired application cannot be rejected");
        }
        app.setStage(ApplicationStage.REJECTED);
        app.setRejectionReason(reason);
        return applications.save(app);
    }

    @Transactional
    public Application updateOfferSalary(UUID organizationId, UUID id, BigDecimal offerSalary) {
        Application app = getById(organizationId, id);
        app.setOfferSalary(offerSalary);
        return applications.save(app);
    }
}
