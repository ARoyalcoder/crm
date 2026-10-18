package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import com.pawanputra.bos.recruitment.api.InterviewType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A scheduled interview for an application.
 */
@Entity
@Table(name = "interviews")
public class Interview extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "application_id", nullable = false, updatable = false)
    private UUID applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false, length = 20)
    private InterviewType interviewType;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "interviewer_user_id", nullable = false)
    private UUID interviewerUserId;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "feedback", columnDefinition = "text")
    private String feedback;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    protected Interview() {
        // for JPA
    }

    public Interview(UUID organizationId, UUID applicationId) {
        this.organizationId = organizationId;
        this.applicationId = applicationId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public InterviewType getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(InterviewType interviewType) {
        this.interviewType = interviewType;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public UUID getInterviewerUserId() {
        return interviewerUserId;
    }

    public void setInterviewerUserId(UUID interviewerUserId) {
        this.interviewerUserId = interviewerUserId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
