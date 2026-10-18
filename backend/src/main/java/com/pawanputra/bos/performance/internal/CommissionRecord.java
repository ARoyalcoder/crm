package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.CommissionStatus;
import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Records a single commission earned by an employee on a specific transaction.
 * Created automatically by {@link CommissionRuleService#calculateCommission} with PENDING status;
 * progressed to APPROVED → PAID or CANCELLED by finance/HR operations.
 */
@Entity
@Table(name = "commission_records")
public class CommissionRecord extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    /** FK → employee_profiles.id */
    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    /** FK → commission_rules.id */
    @Column(name = "rule_id", nullable = false, updatable = false)
    private UUID ruleId;

    /** "ORDER", "INVOICE", or "PAYMENT" */
    @Column(name = "source_type", nullable = false, length = 20, updatable = false)
    private String sourceType;

    /** The id of the order/invoice/payment that triggered this commission. */
    @Column(name = "source_id", nullable = false, updatable = false)
    private UUID sourceId;

    /** The order/invoice value the commission is calculated on. */
    @Column(name = "base_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseAmount;

    /** The calculated commission amount. */
    @Column(name = "commission_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal commissionAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CommissionStatus status = CommissionStatus.PENDING;

    @Column(name = "period_month", nullable = false)
    private int periodMonth;

    @Column(name = "period_year", nullable = false)
    private int periodYear;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    /** FK → users.id; populated when status moves to APPROVED. */
    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected CommissionRecord() {
        // for JPA
    }

    public CommissionRecord(
            UUID organizationId,
            UUID employeeId,
            UUID ruleId,
            String sourceType,
            UUID sourceId,
            BigDecimal baseAmount,
            BigDecimal commissionAmount,
            int periodMonth,
            int periodYear,
            String notes) {
        this.organizationId = organizationId;
        this.employeeId = employeeId;
        this.ruleId = ruleId;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.baseAmount = baseAmount;
        this.commissionAmount = commissionAmount;
        this.periodMonth = periodMonth;
        this.periodYear = periodYear;
        this.notes = notes;
        this.status = CommissionStatus.PENDING;
    }

    public void approve(UUID approvedByUserId, Instant now) {
        this.status = CommissionStatus.APPROVED;
        this.approvedBy = approvedByUserId;
        this.approvedAt = now;
    }

    public void markPaid(Instant now) {
        this.status = CommissionStatus.PAID;
        this.paidAt = now;
    }

    public void cancel() {
        this.status = CommissionStatus.CANCELLED;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getEmployeeId() { return employeeId; }
    public UUID getRuleId() { return ruleId; }
    public String getSourceType() { return sourceType; }
    public UUID getSourceId() { return sourceId; }
    public BigDecimal getBaseAmount() { return baseAmount; }
    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public CommissionStatus getStatus() { return status; }
    public int getPeriodMonth() { return periodMonth; }
    public int getPeriodYear() { return periodYear; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getApprovedBy() { return approvedBy; }
    public Instant getApprovedAt() { return approvedAt; }
    public Instant getPaidAt() { return paidAt; }
}
