package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Work-specific data for a platform user. This entity complements {@code identity.User} rather than
 * duplicating it: name, email and phone stay in {@code User}; department, designation, joining date,
 * leave history and so on live here.
 */
@Entity
@Table(name = "employee_profiles")
public class EmployeeProfile {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    /** FK → users.id. One user maps to at most one employee profile (UNIQUE constraint). */
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    /** Auto-generated per organization: EMP-001, EMP-002 … */
    @Column(name = "employee_code", nullable = false, length = 20)
    private String employeeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "department", nullable = false, length = 30)
    private WorkforceDepartment department;

    /** Free-text job title, e.g. "Senior Technician" or "Sales Manager". */
    @Column(name = "designation", nullable = false, length = 150)
    private String designation;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    /** Self-reference: the employee who directly manages this person. */
    @Column(name = "manager_id")
    private UUID managerId;

    /** JSON array or comma-separated list of skill strings. */
    @Column(name = "skills", columnDefinition = "text")
    private String skills;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_status", nullable = false, length = 20)
    private EmploymentStatus employmentStatus = EmploymentStatus.PROBATION;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected EmployeeProfile() {
        // for JPA
    }

    public EmployeeProfile(
            UUID organizationId,
            UUID userId,
            String employeeCode,
            WorkforceDepartment department,
            String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus,
            String actor) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.userId = userId;
        this.employeeCode = employeeCode;
        this.department = department;
        this.designation = designation;
        this.joiningDate = joiningDate;
        this.managerId = managerId;
        this.skills = skills;
        this.employmentStatus = employmentStatus != null ? employmentStatus : EmploymentStatus.PROBATION;
        this.createdAt = Instant.now();
        this.createdBy = actor;
        this.updatedAt = this.createdAt;
        this.updatedBy = actor;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getUserId() { return userId; }
    public String getEmployeeCode() { return employeeCode; }

    public WorkforceDepartment getDepartment() { return department; }
    public void setDepartment(WorkforceDepartment department) { this.department = department; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public LocalDate getJoiningDate() { return joiningDate; }
    public void setJoiningDate(LocalDate joiningDate) { this.joiningDate = joiningDate; }

    public UUID getManagerId() { return managerId; }
    public void setManagerId(UUID managerId) { this.managerId = managerId; }

    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }

    public EmploymentStatus getEmploymentStatus() { return employmentStatus; }
    public void setEmploymentStatus(EmploymentStatus employmentStatus) { this.employmentStatus = employmentStatus; }

    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public long getVersion() { return version; }
}
