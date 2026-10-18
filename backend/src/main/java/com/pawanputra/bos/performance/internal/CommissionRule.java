package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.CommissionType;
import com.pawanputra.bos.platform.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A rule that determines how much commission an employee earns on a given transaction.
 * Rules are matched by service and/or role; the most specific matching active rule wins.
 * Set {@code active = false} to retire a rule rather than deleting it.
 */
@Entity
@Table(name = "commission_rules")
public class CommissionRule extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    /** FK → services.id. Null means the rule applies to all services. */
    @Column(name = "service_id")
    private UUID serviceId;

    /** Role code, e.g. "SALES_MANAGER". Null means all roles are eligible. */
    @Column(name = "eligible_role_code", length = 50)
    private String eligibleRoleCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "commission_type", nullable = false, length = 20)
    private CommissionType commissionType;

    /** Percentage (e.g. 5.0000 = 5%) or a fixed monetary amount, depending on {@link #commissionType}. */
    @Column(name = "value", nullable = false, precision = 10, scale = 4)
    private BigDecimal value;

    /** Minimum order / invoice value required to qualify. Null means no minimum. */
    @Column(name = "min_order_value", precision = 15, scale = 2)
    private BigDecimal minOrderValue;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected CommissionRule() {
        // for JPA
    }

    public CommissionRule(
            UUID organizationId,
            String name,
            UUID serviceId,
            String eligibleRoleCode,
            CommissionType commissionType,
            BigDecimal value,
            BigDecimal minOrderValue) {
        this.organizationId = organizationId;
        this.name = name;
        this.serviceId = serviceId;
        this.eligibleRoleCode = eligibleRoleCode;
        this.commissionType = commissionType;
        this.value = value;
        this.minOrderValue = minOrderValue;
        this.active = true;
    }

    public UUID getOrganizationId() { return organizationId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }

    public String getEligibleRoleCode() { return eligibleRoleCode; }
    public void setEligibleRoleCode(String eligibleRoleCode) { this.eligibleRoleCode = eligibleRoleCode; }

    public CommissionType getCommissionType() { return commissionType; }
    public void setCommissionType(CommissionType commissionType) { this.commissionType = commissionType; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public BigDecimal getMinOrderValue() { return minOrderValue; }
    public void setMinOrderValue(BigDecimal minOrderValue) { this.minOrderValue = minOrderValue; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    /**
     * Calculate the commission on the given base amount according to this rule.
     * Does not check whether the rule is active or the minimum order value is met — callers do that.
     */
    public BigDecimal calculate(BigDecimal baseAmount) {
        if (commissionType == CommissionType.PERCENTAGE) {
            return baseAmount.multiply(value).divide(java.math.BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        }
        return value.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
