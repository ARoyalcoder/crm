package com.pawanputra.bos.vendor.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorContactRepository extends JpaRepository<VendorContact, UUID> {

    List<VendorContact> findAllByVendorIdOrderByPrimaryContactDescNameAsc(UUID vendorId);

    Optional<VendorContact> findByIdAndVendorId(UUID id, UUID vendorId);

    void deleteByVendorId(UUID vendorId);
}
