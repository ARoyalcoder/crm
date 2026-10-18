package com.pawanputra.bos.performance.web;

import com.pawanputra.bos.performance.api.CommissionType;
import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.api.TargetType;
import com.pawanputra.bos.performance.internal.CommissionRuleService.SaveRuleCmd;
import com.pawanputra.bos.performance.internal.PerformanceTargetService.SetTargetCmd;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/** Request bodies used by the performance controllers. */
public final class PerformanceDtos {

    private PerformanceDtos() {
    }

    /** Body of PUT /api/v1/employees/{employeeId}/targets */
    public record SetTargetRequest(
            @NotNull TargetType targetType,
            @NotNull TargetPeriod period,
            @NotNull Integer periodYear,
            Integer periodMonth,
            Integer periodQuarter,
            @NotNull @DecimalMin("0.00") BigDecimal targetValue,
            String notes) {

        SetTargetCmd toCommand() {
            return new SetTargetCmd(targetType, period, periodYear, periodMonth, periodQuarter, targetValue, notes);
        }
    }

    /** Body of POST /api/v1/commission-rules and PUT /api/v1/commission-rules/{id} */
    public record SaveCommissionRuleRequest(
            @NotBlank String name,
            UUID serviceId,
            String eligibleRoleCode,
            @NotNull CommissionType commissionType,
            @NotNull @DecimalMin("0.0001") BigDecimal value,
            @DecimalMin("0.00") BigDecimal minOrderValue,
            boolean active) {

        SaveRuleCmd toCommand() {
            return new SaveRuleCmd(name, serviceId, eligibleRoleCode, commissionType, value, minOrderValue, active);
        }
    }
}
