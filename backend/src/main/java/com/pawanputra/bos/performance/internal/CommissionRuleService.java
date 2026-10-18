package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.CommissionType;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CommissionRuleService {

    /** Command for creating or updating a commission rule. */
    public record SaveRuleCmd(
            String name,
            UUID serviceId,
            String eligibleRoleCode,
            CommissionType commissionType,
            BigDecimal value,
            BigDecimal minOrderValue,
            boolean active) {
    }

    private final CommissionRuleRepository rules;
    private final CommissionRecordRepository records;

    public CommissionRuleService(CommissionRuleRepository rules, CommissionRecordRepository records) {
        this.rules = rules;
        this.records = records;
    }

    // ---- CRUD ---------------------------------------------------------------

    public CommissionRule create(UUID organizationId, SaveRuleCmd cmd) {
        return rules.save(new CommissionRule(
                organizationId,
                cmd.name(),
                cmd.serviceId(),
                cmd.eligibleRoleCode(),
                cmd.commissionType(),
                cmd.value(),
                cmd.minOrderValue()));
    }

    public CommissionRule update(UUID organizationId, UUID id, SaveRuleCmd cmd) {
        CommissionRule rule = get(organizationId, id);
        rule.setName(cmd.name());
        rule.setServiceId(cmd.serviceId());
        rule.setEligibleRoleCode(cmd.eligibleRoleCode());
        rule.setCommissionType(cmd.commissionType());
        rule.setValue(cmd.value());
        rule.setMinOrderValue(cmd.minOrderValue());
        rule.setActive(cmd.active());
        return rules.save(rule);
    }

    public void delete(UUID organizationId, UUID id) {
        CommissionRule rule = get(organizationId, id);
        rules.delete(rule);
    }

    @Transactional(readOnly = true)
    public CommissionRule get(UUID organizationId, UUID id) {
        return rules.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new EntityNotFoundException("CommissionRule not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<CommissionRule> listAll(UUID organizationId, Boolean activeFilter) {
        if (activeFilter != null) {
            return rules.findAllByOrganizationIdAndActive(organizationId, activeFilter);
        }
        return rules.findAllByOrganizationId(organizationId);
    }

    // ---- Commission calculation ---------------------------------------------

    /**
     * Find the best-matching active commission rule for a transaction and, if found and the base
     * amount meets the minimum, create a PENDING {@link CommissionRecord}.
     *
     * <p>Matching precedence: service-specific rule > catch-all rule. Within a tier the first
     * matching rule (by id) wins. Role is checked if the rule specifies one.
     *
     * @param employeeRoleCode the role code of the employee receiving the commission
     * @return the created record, or empty if no rule matches
     */
    public Optional<CommissionRecord> calculateCommission(
            UUID organizationId,
            UUID employeeId,
            String employeeRoleCode,
            String sourceType,
            UUID sourceId,
            BigDecimal baseAmount,
            UUID serviceId) {

        // Idempotency: don't create a duplicate record for the same source event
        if (records.existsByOrganizationIdAndEmployeeIdAndSourceTypeAndSourceId(
                organizationId, employeeId, sourceType, sourceId)) {
            return Optional.empty();
        }

        List<CommissionRule> candidates = serviceId != null
                ? rules.findActiveMatchingRules(organizationId, serviceId)
                : rules.findActiveCatchAllRules(organizationId);

        CommissionRule matched = candidates.stream()
                .filter(r -> roleMatches(r, employeeRoleCode))
                .filter(r -> minimumMet(r, baseAmount))
                .findFirst()
                .orElse(null);

        if (matched == null) {
            return Optional.empty();
        }

        LocalDate today = LocalDate.now();
        CommissionRecord record = new CommissionRecord(
                organizationId,
                employeeId,
                matched.getId(),
                sourceType,
                sourceId,
                baseAmount,
                matched.calculate(baseAmount),
                today.getMonthValue(),
                today.getYear(),
                null);
        return Optional.of(records.save(record));
    }

    private boolean roleMatches(CommissionRule rule, String employeeRoleCode) {
        return rule.getEligibleRoleCode() == null
                || rule.getEligibleRoleCode().equalsIgnoreCase(employeeRoleCode);
    }

    private boolean minimumMet(CommissionRule rule, BigDecimal baseAmount) {
        return rule.getMinOrderValue() == null
                || baseAmount.compareTo(rule.getMinOrderValue()) >= 0;
    }
}
