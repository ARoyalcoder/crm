package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.CommissionStatus;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CommissionRecordService {

    /** Totals grouped by status for the summary tile. */
    public record CommissionSummary(
            BigDecimal pendingTotal,
            BigDecimal approvedTotal,
            BigDecimal paidTotal,
            BigDecimal cancelledTotal) {
    }

    private final CommissionRecordRepository records;

    public CommissionRecordService(CommissionRecordRepository records) {
        this.records = records;
    }

    // ---- Queries ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<CommissionRecord> listByEmployee(
            UUID organizationId, UUID employeeId, int year, int month, CommissionStatus status) {
        if (status != null) {
            return records.findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriodMonthAndStatus(
                    organizationId, employeeId, year, month, status);
        }
        return records.findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriodMonth(
                organizationId, employeeId, year, month);
    }

    @Transactional(readOnly = true)
    public Page<CommissionRecord> listAll(UUID organizationId, Pageable pageable) {
        return records.findAllByOrganizationId(organizationId, pageable);
    }

    @Transactional(readOnly = true)
    public CommissionRecord get(UUID organizationId, UUID id) {
        return records.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new EntityNotFoundException("CommissionRecord not found: " + id));
    }

    @Transactional(readOnly = true)
    public CommissionSummary getSummaryByEmployee(UUID organizationId, UUID employeeId, int year, int month) {
        return buildSummary(records.sumByStatusForEmployee(organizationId, employeeId, year, month));
    }

    @Transactional(readOnly = true)
    public CommissionSummary getSummaryForOrg(UUID organizationId, int year, int month) {
        return buildSummary(records.sumByStatusForOrg(organizationId, year, month));
    }

    // ---- State transitions --------------------------------------------------

    public CommissionRecord approve(UUID organizationId, UUID id, UUID approvedByUserId) {
        CommissionRecord rec = get(organizationId, id);
        if (rec.getStatus() != CommissionStatus.PENDING) {
            throw new IllegalStateException("Only PENDING commissions can be approved; current status: " + rec.getStatus());
        }
        rec.approve(approvedByUserId, Instant.now());
        return records.save(rec);
    }

    public CommissionRecord markPaid(UUID organizationId, UUID id) {
        CommissionRecord rec = get(organizationId, id);
        if (rec.getStatus() != CommissionStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED commissions can be marked paid; current status: " + rec.getStatus());
        }
        rec.markPaid(Instant.now());
        return records.save(rec);
    }

    public CommissionRecord cancel(UUID organizationId, UUID id) {
        CommissionRecord rec = get(organizationId, id);
        if (rec.getStatus() == CommissionStatus.PAID) {
            throw new IllegalStateException("Paid commissions cannot be cancelled.");
        }
        rec.cancel();
        return records.save(rec);
    }

    // ---- helpers ------------------------------------------------------------

    private CommissionSummary buildSummary(List<Object[]> rows) {
        Map<CommissionStatus, BigDecimal> totals = new EnumMap<>(CommissionStatus.class);
        for (CommissionStatus s : CommissionStatus.values()) {
            totals.put(s, BigDecimal.ZERO);
        }
        for (Object[] row : rows) {
            CommissionStatus status = CommissionStatus.valueOf(row[0].toString());
            BigDecimal amount = row[1] == null ? BigDecimal.ZERO : new BigDecimal(row[1].toString());
            totals.put(status, amount);
        }
        return new CommissionSummary(
                totals.get(CommissionStatus.PENDING),
                totals.get(CommissionStatus.APPROVED),
                totals.get(CommissionStatus.PAID),
                totals.get(CommissionStatus.CANCELLED));
    }
}
