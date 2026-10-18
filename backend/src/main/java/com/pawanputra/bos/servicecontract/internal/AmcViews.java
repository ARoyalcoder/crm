package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.AmcFrequency;
import com.pawanputra.bos.servicecontract.api.AmcStatus;
import com.pawanputra.bos.servicecontract.api.RenewalStatus;
import com.pawanputra.bos.servicecontract.api.VisitStatus;
import com.pawanputra.bos.servicecontract.api.VisitType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AmcViews {

    private AmcViews() {
    }

    public record ContractSummary(
            UUID id,
            UUID organizationId,
            String contractNumber,
            UUID customerId,
            String customerName,
            UUID serviceOfferingId,
            UUID projectId,
            BigDecimal contractValue,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            AmcFrequency frequency,
            UUID assignedEmployeeId,
            AmcStatus status,
            RenewalStatus renewalStatus,
            UUID renewedFromId,
            Instant createdAt) {

        public static ContractSummary from(AmcContract c, String customerName) {
            return new ContractSummary(
                    c.getId(),
                    c.getOrganizationId(),
                    c.getContractNumber(),
                    c.getCustomerId(),
                    customerName,
                    c.getServiceOfferingId(),
                    c.getProjectId(),
                    c.getContractValue(),
                    c.getCurrency(),
                    c.getStartDate(),
                    c.getEndDate(),
                    c.getFrequency(),
                    c.getAssignedEmployeeId(),
                    c.getStatus(),
                    c.getRenewalStatus(),
                    c.getRenewedFromId(),
                    c.getCreatedAt());
        }
    }

    public record ContractDetail(
            UUID id,
            UUID organizationId,
            String contractNumber,
            UUID customerId,
            String customerName,
            UUID serviceOfferingId,
            String serviceName,
            UUID projectId,
            String projectTitle,
            BigDecimal contractValue,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            AmcFrequency frequency,
            UUID assignedEmployeeId,
            String assignedEmployeeName,
            UUID slaId,
            AmcStatus status,
            RenewalStatus renewalStatus,
            String terms,
            String notes,
            UUID renewedFromId,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version,
            List<VisitView> visits) {

        public static ContractDetail from(AmcContract c, Names names, List<VisitView> visits) {
            return new ContractDetail(
                    c.getId(),
                    c.getOrganizationId(),
                    c.getContractNumber(),
                    c.getCustomerId(),
                    names.customer(),
                    c.getServiceOfferingId(),
                    names.service(),
                    c.getProjectId(),
                    names.project(),
                    c.getContractValue(),
                    c.getCurrency(),
                    c.getStartDate(),
                    c.getEndDate(),
                    c.getFrequency(),
                    c.getAssignedEmployeeId(),
                    names.employee(),
                    c.getSlaId(),
                    c.getStatus(),
                    c.getRenewalStatus(),
                    c.getTerms(),
                    c.getNotes(),
                    c.getRenewedFromId(),
                    c.getCreatedAt(),
                    c.getCreatedBy(),
                    c.getUpdatedAt(),
                    c.getUpdatedBy(),
                    c.getVersion(),
                    visits);
        }
    }

    /** The names of the records a contract refers to, so a screen can say who and what instead of showing ids. */
    public record Names(String customer, String project, String service, String employee) {
    }

    /** A visit, with the names a person needs: who is going, and which contract (and customer) it is for. */
    public record VisitView(
            UUID id,
            UUID contractId,
            String contractNumber,
            String customerName,
            LocalDate scheduledDate,
            LocalDate completedDate,
            VisitType visitType,
            UUID assignedEmployeeId,
            String assignedEmployeeName,
            String notes,
            String outcome,
            VisitStatus status,
            Instant createdAt) {

        public static VisitView from(AmcServiceVisit v, String contractNumber, String customerName, String assignedEmployeeName) {
            return new VisitView(
                    v.getId(),
                    v.getContractId(),
                    contractNumber,
                    customerName,
                    v.getScheduledDate(),
                    v.getCompletedDate(),
                    v.getVisitType(),
                    v.getAssignedEmployeeId(),
                    assignedEmployeeName,
                    v.getNotes(),
                    v.getOutcome(),
                    v.getStatus(),
                    v.getCreatedAt());
        }
    }

    public record Dashboard(
            long totalActive,
            long expiringSoon,
            long overdueRenewals,
            long upcomingVisits,
            List<ContractSummary> expiringSoonContracts,
            List<VisitView> upcomingVisitsList) {
    }
}
