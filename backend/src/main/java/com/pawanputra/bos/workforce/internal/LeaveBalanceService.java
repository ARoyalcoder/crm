package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.workforce.api.LeaveType;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LeaveBalanceService {

    /** Default annual allocations per leave type. */
    private static final Map<LeaveType, Integer> DEFAULTS = Map.of(
            LeaveType.ANNUAL, 12,
            LeaveType.SICK, 7,
            LeaveType.CASUAL, 7,
            LeaveType.UNPAID, 0,
            LeaveType.MATERNITY, 90,
            LeaveType.PATERNITY, 15,
            LeaveType.COMPENSATORY, 0
    );

    private final LeaveBalanceRepository leaveBalances;

    public LeaveBalanceService(LeaveBalanceRepository leaveBalances) {
        this.leaveBalances = leaveBalances;
    }

    // --- Mutations ---

    /**
     * Creates default leave balance rows for all leave types for the given employee and year.
     * Idempotent: skips leave types that already have a balance row.
     */
    public List<LeaveBalance> initializeLeaveBalances(UUID organizationId, UUID employeeId, int year) {
        return Arrays.stream(LeaveType.values())
                .filter(type -> !leaveBalances.existsByEmployeeIdAndYearAndLeaveType(employeeId, year, type))
                .map(type -> leaveBalances.save(
                        new LeaveBalance(organizationId, employeeId, year, type,
                                DEFAULTS.getOrDefault(type, 0))))
                .collect(Collectors.toList());
    }

    public LeaveBalance updateLeaveBalance(UUID organizationId, UUID employeeId,
                                           LeaveType leaveType, int year, int used) {
        LeaveBalance balance = leaveBalances.findByEmployeeIdAndYearAndLeaveType(employeeId, year, leaveType)
                .orElseGet(() -> leaveBalances.save(
                        new LeaveBalance(organizationId, employeeId, year, leaveType,
                                DEFAULTS.getOrDefault(leaveType, 0))));
        balance.setUsed(used);
        return leaveBalances.save(balance);
    }

    public LeaveBalance setAllocated(UUID organizationId, UUID employeeId,
                                     LeaveType leaveType, int year, int allocated) {
        LeaveBalance balance = leaveBalances.findByEmployeeIdAndYearAndLeaveType(employeeId, year, leaveType)
                .orElseGet(() -> leaveBalances.save(
                        new LeaveBalance(organizationId, employeeId, year, leaveType, 0)));
        balance.setAllocated(allocated);
        return leaveBalances.save(balance);
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<LeaveBalance> getBalances(UUID employeeId, int year) {
        return leaveBalances.findAllByEmployeeIdAndYearOrderByLeaveTypeAsc(employeeId, year);
    }

    @Transactional(readOnly = true)
    public LeaveBalance getBalance(UUID employeeId, int year, LeaveType leaveType) {
        return leaveBalances.findByEmployeeIdAndYearAndLeaveType(employeeId, year, leaveType)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "LeaveBalance", employeeId + "/" + year + "/" + leaveType));
    }
}
