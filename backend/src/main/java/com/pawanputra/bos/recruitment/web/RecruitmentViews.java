package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.recruitment.api.ApplicationStage;
import com.pawanputra.bos.recruitment.api.InterviewType;
import com.pawanputra.bos.recruitment.api.JobStatus;
import com.pawanputra.bos.recruitment.internal.Application;
import com.pawanputra.bos.recruitment.internal.Candidate;
import com.pawanputra.bos.recruitment.internal.Interview;
import com.pawanputra.bos.recruitment.internal.JobOpening;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Immutable read-model records returned by the recruitment controllers. */
public final class RecruitmentViews {

    private RecruitmentViews() {
    }

    public record JobOpeningView(
            UUID id,
            UUID organizationId,
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
            LocalDate closingDate,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version,
            /** How many people have applied. Filled in where the list is shown, absent when a job is just saved. */
            Long applicationCount) {

        public static JobOpeningView from(JobOpening j) {
            return from(j, null);
        }

        public static JobOpeningView from(JobOpening j, Long applicationCount) {
            return new JobOpeningView(
                    j.getId(), j.getOrganizationId(), j.getTitle(), j.getDepartment(), j.getLocation(),
                    j.getDescription(), j.getRequirements(), j.getMinExperienceYears(), j.getMinSalary(),
                    j.getMaxSalary(), j.getStatus(), j.getPostedDate(), j.getClosingDate(),
                    j.getCreatedAt(), j.getCreatedBy(), j.getUpdatedAt(), j.getUpdatedBy(), j.getVersion(),
                    applicationCount);
        }
    }

    public record CandidateView(
            UUID id,
            UUID organizationId,
            String firstName,
            String lastName,
            String fullName,
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
            String notes,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version) {

        public static CandidateView from(Candidate c) {
            return new CandidateView(
                    c.getId(), c.getOrganizationId(), c.getFirstName(), c.getLastName(),
                    c.getFullName(), c.getEmail(), c.getPhone(), c.getLocation(),
                    c.getExperienceYears(), c.getCurrentSalary(), c.getExpectedSalary(),
                    c.getNoticePeriodDays(), c.getResumeStorageKey(), c.getResumeFileName(),
                    c.getLinkedInUrl(), c.getNotes(), c.getCreatedAt(), c.getCreatedBy(),
                    c.getUpdatedAt(), c.getUpdatedBy(), c.getVersion());
        }
    }

    public record ApplicationView(
            UUID id,
            UUID organizationId,
            UUID jobId,
            UUID candidateId,
            ApplicationStage stage,
            LocalDate appliedDate,
            UUID assignedToUserId,
            String stageNotes,
            String rejectionReason,
            BigDecimal offerSalary,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version,
            /** The names behind the ids, so a list can say who and what without a lookup for each row. */
            String candidateName,
            String jobTitle,
            String assignedToName) {

        public static ApplicationView from(Application a, String candidateName, String jobTitle, String assignedToName) {
            return new ApplicationView(
                    a.getId(), a.getOrganizationId(), a.getJobId(), a.getCandidateId(),
                    a.getStage(), a.getAppliedDate(), a.getAssignedToUserId(), a.getStageNotes(),
                    a.getRejectionReason(), a.getOfferSalary(), a.getCreatedAt(), a.getCreatedBy(),
                    a.getUpdatedAt(), a.getUpdatedBy(), a.getVersion(), candidateName, jobTitle, assignedToName);
        }
    }

    public record ApplicationDetailView(
            ApplicationView application,
            CandidateView candidate,
            JobOpeningView job,
            List<InterviewView> interviews) {
    }

    public record InterviewView(
            UUID id,
            UUID organizationId,
            UUID applicationId,
            InterviewType interviewType,
            Instant scheduledAt,
            Integer durationMinutes,
            UUID interviewerUserId,
            String location,
            String notes,
            String feedback,
            Integer rating,
            boolean completed,
            Instant createdAt,
            Instant updatedAt,
            String interviewerName) {

        public static InterviewView from(Interview i, String interviewerName) {
            return new InterviewView(
                    i.getId(), i.getOrganizationId(), i.getApplicationId(), i.getInterviewType(),
                    i.getScheduledAt(), i.getDurationMinutes(), i.getInterviewerUserId(),
                    i.getLocation(), i.getNotes(), i.getFeedback(), i.getRating(), i.isCompleted(),
                    i.getCreatedAt(), i.getUpdatedAt(), interviewerName);
        }
    }
}
