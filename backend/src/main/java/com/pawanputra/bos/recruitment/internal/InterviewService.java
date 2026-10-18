package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.identity.api.UserDirectory;
import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.recruitment.api.InterviewType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InterviewService {

    private final InterviewRepository interviews;
    private final ApplicationRepository applications;
    private final UserDirectory users;

    public InterviewService(InterviewRepository interviews, ApplicationRepository applications, UserDirectory users) {
        this.interviews = interviews;
        this.applications = applications;
        this.users = users;
    }

    /** The person taking the interview must be someone who can sign in to this organization. */
    private void requireInterviewer(UUID organizationId, UUID userId) {
        boolean usable = users.find(organizationId, userId).filter(UserDirectory.UserSummary::active).isPresent();
        if (!usable) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Choose an active person from your organization to take the interview");
        }
    }

    public record ScheduleCmd(
            InterviewType interviewType,
            Instant scheduledAt,
            Integer durationMinutes,
            UUID interviewerUserId,
            String location,
            String notes) {
    }

    public record CompleteCmd(String feedback, Integer rating) {
    }

    public Interview getById(UUID organizationId, UUID id) {
        return interviews.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview", id));
    }

    public List<Interview> listByApplication(UUID applicationId) {
        return interviews.findAllByApplicationIdOrderByScheduledAtAsc(applicationId);
    }

    @Transactional
    public Interview schedule(UUID organizationId, UUID applicationId, ScheduleCmd cmd) {
        // Verify application belongs to org
        applications.findByIdAndOrganizationId(applicationId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));
        requireInterviewer(organizationId, cmd.interviewerUserId());
        Interview interview = new Interview(organizationId, applicationId);
        interview.setInterviewType(cmd.interviewType());
        interview.setScheduledAt(cmd.scheduledAt());
        interview.setDurationMinutes(cmd.durationMinutes());
        interview.setInterviewerUserId(cmd.interviewerUserId());
        interview.setLocation(cmd.location());
        interview.setNotes(cmd.notes());
        return interviews.save(interview);
    }

    @Transactional
    public Interview update(UUID organizationId, UUID id, ScheduleCmd cmd) {
        Interview interview = getById(organizationId, id);
        if (interview.isCompleted()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A completed interview cannot be rescheduled");
        }
        requireInterviewer(organizationId, cmd.interviewerUserId());
        interview.setInterviewType(cmd.interviewType());
        interview.setScheduledAt(cmd.scheduledAt());
        interview.setDurationMinutes(cmd.durationMinutes());
        interview.setInterviewerUserId(cmd.interviewerUserId());
        interview.setLocation(cmd.location());
        interview.setNotes(cmd.notes());
        return interviews.save(interview);
    }

    @Transactional
    public Interview complete(UUID organizationId, UUID id, CompleteCmd cmd) {
        Interview interview = getById(organizationId, id);
        if (interview.isCompleted()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Interview is already marked as completed");
        }
        if (cmd.rating() != null && (cmd.rating() < 1 || cmd.rating() > 5)) {
            throw new ApiException(ErrorCode.MALFORMED_REQUEST, "Rating must be between 1 and 5");
        }
        interview.setFeedback(cmd.feedback());
        interview.setRating(cmd.rating());
        interview.setCompleted(true);
        return interviews.save(interview);
    }

    @Transactional
    public void cancel(UUID organizationId, UUID id) {
        Interview interview = getById(organizationId, id);
        if (interview.isCompleted()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "A completed interview cannot be cancelled");
        }
        interviews.delete(interview);
    }
}
