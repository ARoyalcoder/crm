package com.pawanputra.bos.servicecontract.web;

import com.pawanputra.bos.servicecontract.api.WarrantyStatus;
import com.pawanputra.bos.servicecontract.internal.WarrantyService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

final class WarrantyDtos {

    private WarrantyDtos() {
    }

    record CreateWarrantyRequest(
            @NotNull UUID customerId,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            @NotBlank @Size(max = 500) String description,
            String terms,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate) {

        WarrantyService.CreateWarrantyCommand toCommand() {
            return new WarrantyService.CreateWarrantyCommand(
                    customerId,
                    orderId,
                    projectId,
                    serviceOfferingId,
                    description.trim(),
                    terms != null ? terms.trim() : null,
                    startDate,
                    endDate);
        }
    }

    record UpdateWarrantyRequest(
            @NotNull UUID customerId,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            @NotBlank @Size(max = 500) String description,
            String terms,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            WarrantyStatus status) {

        WarrantyService.UpdateWarrantyCommand toCommand() {
            return new WarrantyService.UpdateWarrantyCommand(
                    customerId,
                    orderId,
                    projectId,
                    serviceOfferingId,
                    description.trim(),
                    terms != null ? terms.trim() : null,
                    startDate,
                    endDate,
                    status);
        }
    }
}
