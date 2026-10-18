package com.pawanputra.bos.rewards.internal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRewardRepository extends JpaRepository<CustomerReward, UUID> {

    Optional<CustomerReward> findByCustomerIdAndOrganizationId(UUID customerId, UUID organizationId);
}
