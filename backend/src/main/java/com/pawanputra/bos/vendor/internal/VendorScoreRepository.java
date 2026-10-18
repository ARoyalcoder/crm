package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorScoreRepository extends JpaRepository<VendorScore, UUID> {

    List<VendorScore> findAllByVendorId(UUID vendorId);

    Optional<VendorScore> findByVendorIdAndCategory(UUID vendorId, VendorRatingCategory category);
}
