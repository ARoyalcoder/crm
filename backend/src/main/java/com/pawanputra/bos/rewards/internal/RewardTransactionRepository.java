package com.pawanputra.bos.rewards.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardTransactionRepository extends JpaRepository<RewardTransaction, UUID> {

    List<RewardTransaction> findAllByCustomerIdAndOrganizationIdOrderByCreatedAtDesc(
            UUID customerId, UUID organizationId);
}
