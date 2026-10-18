package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.WarrantyStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class WarrantyViews {

    private WarrantyViews() {
    }

    public record Summary(
            UUID id,
            UUID organizationId,
            UUID customerId,
            String customerName,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            WarrantyStatus status,
            Instant createdAt,
            String createdBy) {

        public static Summary from(Warranty w, String customerName) {
            return new Summary(
                    w.getId(),
                    w.getOrganizationId(),
                    w.getCustomerId(),
                    customerName,
                    w.getOrderId(),
                    w.getProjectId(),
                    w.getServiceOfferingId(),
                    w.getDescription(),
                    w.getStartDate(),
                    w.getEndDate(),
                    w.getStatus(),
                    w.getCreatedAt(),
                    w.getCreatedBy());
        }
    }

    public record Detail(
            UUID id,
            UUID organizationId,
            UUID customerId,
            String customerName,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            String description,
            String terms,
            LocalDate startDate,
            LocalDate endDate,
            WarrantyStatus status,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy,
            long version) {

        public static Detail from(Warranty w, String customerName) {
            return new Detail(
                    w.getId(),
                    w.getOrganizationId(),
                    w.getCustomerId(),
                    customerName,
                    w.getOrderId(),
                    w.getProjectId(),
                    w.getServiceOfferingId(),
                    w.getDescription(),
                    w.getTerms(),
                    w.getStartDate(),
                    w.getEndDate(),
                    w.getStatus(),
                    w.getCreatedAt(),
                    w.getCreatedBy(),
                    w.getUpdatedAt(),
                    w.getUpdatedBy(),
                    w.getVersion());
        }
    }

    public record CustomerWarranties(
            UUID customerId,
            List<Summary> warranties,
            long activeCount,
            long expiredCount) {
    }
}
