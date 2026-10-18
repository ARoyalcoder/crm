package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A person who has applied or may apply for a job.
 */
@Entity
@Table(name = "candidates")
public class Candidate extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "current_salary", precision = 15, scale = 2)
    private BigDecimal currentSalary;

    @Column(name = "expected_salary", precision = 15, scale = 2)
    private BigDecimal expectedSalary;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "resume_storage_key", length = 500)
    private String resumeStorageKey;

    @Column(name = "resume_file_name", length = 255)
    private String resumeFileName;

    @Column(name = "linked_in_url", length = 500)
    private String linkedInUrl;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    protected Candidate() {
        // for JPA
    }

    public Candidate(UUID organizationId) {
        this.organizationId = organizationId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public BigDecimal getCurrentSalary() {
        return currentSalary;
    }

    public void setCurrentSalary(BigDecimal currentSalary) {
        this.currentSalary = currentSalary;
    }

    public BigDecimal getExpectedSalary() {
        return expectedSalary;
    }

    public void setExpectedSalary(BigDecimal expectedSalary) {
        this.expectedSalary = expectedSalary;
    }

    public Integer getNoticePeriodDays() {
        return noticePeriodDays;
    }

    public void setNoticePeriodDays(Integer noticePeriodDays) {
        this.noticePeriodDays = noticePeriodDays;
    }

    public String getResumeStorageKey() {
        return resumeStorageKey;
    }

    public void setResumeStorageKey(String resumeStorageKey) {
        this.resumeStorageKey = resumeStorageKey;
    }

    public String getResumeFileName() {
        return resumeFileName;
    }

    public void setResumeFileName(String resumeFileName) {
        this.resumeFileName = resumeFileName;
    }

    public String getLinkedInUrl() {
        return linkedInUrl;
    }

    public void setLinkedInUrl(String linkedInUrl) {
        this.linkedInUrl = linkedInUrl;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
