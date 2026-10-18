package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.vendor.api.VendorStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

    Optional<Vendor> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Vendor> findAllByOrganizationIdOrderByCompanyNameAsc(UUID organizationId);

    List<Vendor> findAllByOrganizationIdAndStatusOrderByCompanyNameAsc(UUID organizationId, VendorStatus status);
}
