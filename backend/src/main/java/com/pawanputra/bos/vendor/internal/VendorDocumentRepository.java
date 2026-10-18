package com.pawanputra.bos.vendor.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorDocumentRepository extends JpaRepository<VendorDocument, UUID> {

    List<VendorDocument> findAllByVendorIdOrderByCreatedAtDesc(UUID vendorId);

    Optional<VendorDocument> findByIdAndVendorId(UUID id, UUID vendorId);
}
