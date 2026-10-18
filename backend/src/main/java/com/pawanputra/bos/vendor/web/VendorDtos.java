package com.pawanputra.bos.vendor.web;

import com.pawanputra.bos.vendor.api.PartnerAccessLevel;
import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import com.pawanputra.bos.vendor.api.VendorStatus;
import com.pawanputra.bos.vendor.internal.PartnerService;
import com.pawanputra.bos.vendor.internal.VendorContactService;
import com.pawanputra.bos.vendor.internal.VendorDocumentService;
import com.pawanputra.bos.vendor.internal.VendorService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Request bodies for the vendor and partner endpoints. */
final class VendorDtos {

    private static final String PHONE_PATTERN = "^[+0-9][0-9 ()-]{5,28}$";
    private static final String PHONE_MESSAGE = "must be a phone number";

    private VendorDtos() {
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // --- Vendor ---

    record VendorRequest(
            @NotBlank @Size(max = 200) String companyName,
            @NotBlank @Email @Size(max = 254) String contactEmail,
            @NotBlank @Pattern(regexp = PHONE_PATTERN, message = PHONE_MESSAGE) String contactPhone,
            @Size(max = 2000) String address,
            @Size(max = 2000) String services,
            @Min(1) @Max(365) Integer paymentTermsDays,
            VendorStatus status,
            @Size(max = 4000) String notes) {

        VendorService.CreateVendorCmd toCreateCmd() {
            return new VendorService.CreateVendorCmd(
                    companyName.trim(), contactEmail.trim(), contactPhone.trim(),
                    trimToNull(address), trimToNull(services), paymentTermsDays,
                    status != null ? status : VendorStatus.ACTIVE, trimToNull(notes));
        }

        VendorService.UpdateVendorCmd toUpdateCmd() {
            return new VendorService.UpdateVendorCmd(
                    companyName.trim(), contactEmail.trim(), contactPhone.trim(),
                    trimToNull(address), trimToNull(services), paymentTermsDays,
                    status != null ? status : VendorStatus.ACTIVE, trimToNull(notes));
        }
    }

    // --- Vendor Contact ---

    record VendorContactRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = PHONE_PATTERN, message = PHONE_MESSAGE) String phone,
            @Size(max = 150) String designation,
            Boolean primaryContact) {

        VendorContactService.ContactCmd toCmd() {
            return new VendorContactService.ContactCmd(
                    name.trim(), email.trim(), phone.trim(),
                    trimToNull(designation), Boolean.TRUE.equals(primaryContact));
        }
    }

    // --- Vendor Score ---

    record VendorScoreRequest(
            @NotNull VendorRatingCategory category,
            @NotNull @Min(1) @Max(10) Integer score,
            @Size(max = 2000) String notes) {
    }

    // --- Vendor Document ---

    record VendorDocumentRequest(
            @Size(max = 30) String documentType,
            @NotBlank @Size(max = 300) String fileName,
            @NotBlank @Size(max = 500) String storageKey,
            @Size(max = 100) String mimeType,
            Long fileSize) {

        VendorDocumentService.DocumentCmd toCmd() {
            return new VendorDocumentService.DocumentCmd(
                    trimToNull(documentType), fileName.trim(), storageKey.trim(),
                    trimToNull(mimeType), fileSize);
        }
    }

    // --- Partner ---

    record PartnerRequest(
            @NotBlank @Size(max = 200) String organizationName,
            @NotBlank @Email @Size(max = 254) String contactEmail,
            @NotBlank @Pattern(regexp = PHONE_PATTERN, message = PHONE_MESSAGE) String contactPhone,
            @NotNull PartnerAccessLevel accessLevel,
            @Size(max = 4000) String assignedProjectIds,
            @Size(max = 2000) String services,
            Boolean active,
            UUID userId,
            @Size(max = 4000) String notes) {

        PartnerService.CreatePartnerCmd toCreateCmd() {
            return new PartnerService.CreatePartnerCmd(
                    organizationName.trim(), contactEmail.trim(), contactPhone.trim(),
                    accessLevel, trimToNull(assignedProjectIds), trimToNull(services),
                    !Boolean.FALSE.equals(active), userId, trimToNull(notes));
        }

        PartnerService.UpdatePartnerCmd toUpdateCmd() {
            return new PartnerService.UpdatePartnerCmd(
                    organizationName.trim(), contactEmail.trim(), contactPhone.trim(),
                    accessLevel, trimToNull(assignedProjectIds), trimToNull(services),
                    !Boolean.FALSE.equals(active), userId, trimToNull(notes));
        }
    }
}
