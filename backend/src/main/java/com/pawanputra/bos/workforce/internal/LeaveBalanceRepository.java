package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.LeaveType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {

    Optional<LeaveBalance> findByEmployeeIdAndYearAndLeaveType(UUID employeeId, int year, LeaveType leaveType);

    List<LeaveBalance> findAllByEmployeeIdAndYearOrderByLeaveTypeAsc(UUID employeeId, int year);

    boolean existsByEmployeeIdAndYearAndLeaveType(UUID employeeId, int year, LeaveType leaveType);
}
