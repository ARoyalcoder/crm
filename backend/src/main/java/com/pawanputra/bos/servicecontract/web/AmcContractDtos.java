package com.pawanputra.bos.servicecontract.web;

import com.pawanputra.bos.servicecontract.api.AmcFrequency;
import com.pawanputra.bos.servicecontract.api.AmcStatus;
import com.pawanputra.bos.servicecontract.api.VisitStatus;
import com.pawanputra.bos.servicecontract.api.VisitType;
import com.pawanputra.bos.servicecontract.internal.AmcContractService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

final class AmcContractDtos {

    private AmcContractDtos() {
    }

    record CreateContractRequest(
            @NotNull UUID customerId,
            UUID serviceOfferingId,
            UUID projectId,
            @NotNull @DecimalMin("0.00") BigDecimal contractValue,
            String currency,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotNull AmcFrequency frequency,
            UUID assignedEmployeeId,
            UUID slaId,
            String terms,
            String notes) {

        AmcContractService.CreateContractCommand toCommand() {
            return new AmcContractService.CreateContractCommand(
                    customerId,
                    serviceOfferingId,
                    projectId,
                    contractValue,
                    currency,
                    startDate,
                    endDate,
                    frequency,
                    assignedEmployeeId,
                    slaId,
                    terms != null ? terms.trim() : null,
                    notes != null ? notes.trim() : null);
        }
    }

    record UpdateContractRequest(
            @NotNull UUID customerId,
            UUID serviceOfferingId,
            UUID projectId,
            @NotNull @DecimalMin("0.00") BigDecimal contractValue,
            String currency,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotNull AmcFrequency frequency,
            UUID assignedEmployeeId,
            UUID slaId,
            AmcStatus status,
            String terms,
            String notes) {

        AmcContractService.UpdateContractCommand toCommand() {
            return new AmcContractService.UpdateContractCommand(
                    customerId,
                    serviceOfferingId,
                    projectId,
                    contractValue,
                    currency,
                    startDate,
                    endDate,
                    frequency,
                    assignedEmployeeId,
                    slaId,
                    status,
                    terms != null ? terms.trim() : null,
                    notes != null ? notes.trim() : null);
        }
    }

    record RenewContractRequest(
            @NotNull LocalDate newEndDate,
            @DecimalMin("0.00") BigDecimal newContractValue) {

        AmcContractService.RenewContractCommand toCommand() {
            return new AmcContractService.RenewContractCommand(newEndDate, newContractValue);
        }
    }

    record CreateVisitRequest(
            @NotNull LocalDate scheduledDate,
            VisitType visitType,
            UUID assignedEmployeeId,
            String notes) {

        AmcContractService.CreateVisitCommand toCommand() {
            return new AmcContractService.CreateVisitCommand(
                    scheduledDate,
                    visitType != null ? visitType : VisitType.SCHEDULED,
                    assignedEmployeeId,
                    notes != null ? notes.trim() : null);
        }
    }

    record CompleteVisitRequest(
            LocalDate completedDate,
            String outcome,
            VisitStatus status) {

        AmcContractService.CompleteVisitCommand toCommand() {
            return new AmcContractService.CompleteVisitCommand(
                    completedDate,
                    outcome != null ? outcome.trim() : null,
                    status);
        }
    }
}
