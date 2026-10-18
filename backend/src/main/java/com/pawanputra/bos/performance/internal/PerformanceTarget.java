package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.api.TargetType;
import com.pawanputra.bos.platform.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A numeric goal set for a specific employee for a specific metric over a specific time window.
 * One row per (employee, type, period, year, month/quarter). The unique constraint on the table
 * enforces this. Use {@link PerformanceTargetService#setTarget} which handles the upsert correctly.
 */
@Entity
@Table(name = "performance_targets")
public class PerformanceTarget extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    /** FK → employee_profiles.id */
    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 40)
    private TargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "period", nullable = false, length = 20)
    private TargetPeriod period;

    @Column(name = "period_year", nullable = false)
    private int periodYear;

    /** 1-12 for MONTHLY targets; null for QUARTERLY / YEARLY. */
    @Column(name = "period_month")
    private Integer periodMonth;

    /** 1-4 for QUARTERLY targets; null for MONTHLY / YEARLY. */
    @Column(name = "period_quarter")
    private Integer periodQuarter;

    /** Numeric goal, e.g. a revenue amount in INR or a plain count. */
    @Column(name = "target_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal targetValue;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    protected PerformanceTarget() {
        // for JPA
    }

    public PerformanceTarget(
            UUID organizationId,
            UUID employeeId,
            TargetType targetType,
            TargetPeriod period,
            int periodYear,
            Integer periodMonth,
            Integer periodQuarter,
            BigDecimal targetValue,
            String notes) {
        this.organizationId = organizationId;
        this.employeeId = employeeId;
        this.targetType = targetType;
        this.period = period;
        this.periodYear = periodYear;
        this.periodMonth = periodMonth;
        this.periodQuarter = periodQuarter;
        this.targetValue = targetValue;
        this.notes = notes;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getEmployeeId() { return employeeId; }
    public TargetType getTargetType() { return targetType; }
    public TargetPeriod getPeriod() { return period; }
    public int getPeriodYear() { return periodYear; }
    public Integer getPeriodMonth() { return periodMonth; }
    public Integer getPeriodQuarter() { return periodQuarter; }

    public BigDecimal getTargetValue() { return targetValue; }
    public void setTargetValue(BigDecimal targetValue) { this.targetValue = targetValue; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
