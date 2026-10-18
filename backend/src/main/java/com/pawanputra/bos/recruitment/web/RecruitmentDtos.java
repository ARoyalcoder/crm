package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.recruitment.api.ApplicationStage;
import com.pawanputra.bos.recruitment.api.InterviewType;
import com.pawanputra.bos.recruitment.api.JobStatus;
import com.pawanputra.bos.recruitment.internal.ApplicationService;
import com.pawanputra.bos.recruitment.internal.CandidateService;
import com.pawanputra.bos.recruitment.internal.InterviewService;
import com.pawanputra.bos.recruitment.internal.JobOpeningService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Requests accepted by the recruitment endpoints. */
final class RecruitmentDtos {

    private RecruitmentDtos() {
    }

    // ------------------------------------------------------------------ job openings

    record JobRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 100) String department,
            @Size(max = 200) String location,
            @NotBlank String description,
            String requirements,
            @Min(0) @Max(50) Integer minExperienceYears,
            @DecimalMin("0.00") @Digits(integer = 13, fraction = 2) BigDecimal minSalary,
            @DecimalMin("0.00") @Digits(integer = 13, fraction = 2) BigDecimal maxSalary,
            JobStatus status,
            LocalDate postedDate,
            LocalDate closingDate) {

        JobOpeningService.JobDetails toDetails() {
            return new JobOpeningService.JobDetails(title.trim(), department.trim(),
                    location != null ? location.trim() : null, description.trim(),
                    requirements != null ? requirements.trim() : null,
                    minExperienceYears, minSalary, maxSalary, status, postedDate, closingDate);
        }
    }

    // ------------------------------------------------------------------ candidates

    record CandidateRequest(
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Email @Size(max = 254) String email,
            @Size(max = 30) String phone,
            @Size(max = 200) String location,
            @Min(0) @Max(50) Integer experienceYears,
            @DecimalMin("0.00") @Digits(integer = 13, fraction = 2) BigDecimal currentSalary,
            @DecimalMin("0.00") @Digits(integer = 13, fraction = 2) BigDecimal expectedSalary,
            @Min(0) @Max(365) Integer noticePeriodDays,
            @Size(max = 500) String resumeStorageKey,
            @Size(max = 255) String resumeFileName,
            @Size(max = 500) String linkedInUrl,
            String notes) {

        CandidateService.CandidateDetails toDetails() {
            return new CandidateService.CandidateDetails(firstName.trim(), lastName.trim(),
                    email.trim().toLowerCase(), phone, location, experienceYears, currentSalary,
                    expectedSalary, noticePeriodDays, resumeStorageKey, resumeFileName, linkedInUrl, notes);
        }
    }

    // ------------------------------------------------------------------ applications

    record CreateApplicationRequest(
            @NotNull UUID jobId,
            @NotNull UUID candidateId,
            LocalDate appliedDate,
            UUID assignedToUserId,
            String stageNotes) {

        ApplicationService.CreateApplicationCmd toCommand() {
            return new ApplicationService.CreateApplicationCmd(jobId, candidateId, appliedDate,
                    assignedToUserId, stageNotes);
        }
    }

    record AdvanceStageRequest(@NotNull ApplicationStage stage, String notes) {
    }

    record RejectRequest(String reason) {
    }

    // ------------------------------------------------------------------ interviews

    record ScheduleInterviewRequest(
            @NotNull InterviewType interviewType,
            @NotNull Instant scheduledAt,
            @Min(5) @Max(480) Integer durationMinutes,
            @NotNull UUID interviewerUserId,
            @Size(max = 500) String location,
            String notes) {

        InterviewService.ScheduleCmd toCommand() {
            return new InterviewService.ScheduleCmd(interviewType, scheduledAt, durationMinutes,
                    interviewerUserId, location, notes);
        }
    }

    record CompleteInterviewRequest(String feedback, @Min(1) @Max(5) Integer rating) {

        InterviewService.CompleteCmd toCommand() {
            return new InterviewService.CompleteCmd(feedback, rating);
        }
    }
}
