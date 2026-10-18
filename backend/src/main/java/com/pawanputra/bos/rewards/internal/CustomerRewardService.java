package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.rewards.api.RewardTransactionType;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages loyalty-point balances and transaction history for customers. */
@Service
@Transactional
public class CustomerRewardService {

    private final CustomerRewardRepository rewards;
    private final RewardTransactionRepository transactions;

    public CustomerRewardService(CustomerRewardRepository rewards,
                                  RewardTransactionRepository transactions) {
        this.rewards = rewards;
        this.transactions = transactions;
    }

    /**
     * Get the customer's reward record, creating one if it does not yet exist.
     */
    public CustomerReward getOrCreate(UUID customerId, UUID orgId) {
        return rewards.findByCustomerIdAndOrganizationId(customerId, orgId)
                .orElseGet(() -> rewards.save(new CustomerReward(orgId, customerId)));
    }

    /**
     * Award points to a customer and record the transaction.
     *
     * @param customerId    the customer receiving points
     * @param points        positive number of points to add
     * @param reason        human-readable reason, e.g. "Project Completed"
     * @param referenceType optional entity type, e.g. "PROJECT"
     * @param referenceId   optional entity id
     * @param orgId         organisation scope
     * @return the updated reward record
     */
    public CustomerReward addPoints(UUID customerId, int points, String reason,
                                    String referenceType, UUID referenceId, UUID orgId) {
        CustomerReward reward = getOrCreate(customerId, orgId);
        reward.addPoints(points);
        transactions.save(new RewardTransaction(
                orgId, customerId, RewardTransactionType.EARNED, points,
                reason, referenceType, referenceId));
        return rewards.save(reward);
    }

    /**
     * Redeem points from a customer (deducts points, records a REDEEMED transaction).
     *
     * @param customerId the customer redeeming points
     * @param points     positive number of points to deduct
     * @param reason     human-readable reason
     * @param orgId      organisation scope
     * @return the updated reward record
     */
    public CustomerReward redeemPoints(UUID customerId, int points, String reason, UUID orgId) {
        CustomerReward reward = getOrCreate(customerId, orgId);
        if (reward.getTotalPoints() < points) {
            throw new IllegalArgumentException(
                    "Insufficient points: has " + reward.getTotalPoints() + ", requested " + points);
        }
        reward.deductPoints(points);
        transactions.save(new RewardTransaction(
                orgId, customerId, RewardTransactionType.REDEEMED, -points,
                reason, null, null));
        return rewards.save(reward);
    }

    /**
     * Manually adjust a customer's points (for admin corrections).
     *
     * @param points positive = add, negative = remove
     */
    public CustomerReward adjustPoints(UUID customerId, int points, String reason, UUID orgId) {
        CustomerReward reward = getOrCreate(customerId, orgId);
        if (points >= 0) {
            reward.addPoints(points);
        } else {
            reward.deductPoints(-points);
        }
        transactions.save(new RewardTransaction(
                orgId, customerId, RewardTransactionType.ADJUSTED, points,
                reason, null, null));
        return rewards.save(reward);
    }

    @Transactional(readOnly = true)
    public CustomerReward get(UUID customerId, UUID orgId) {
        return getOrCreate(customerId, orgId);
    }

    @Transactional(readOnly = true)
    public List<RewardTransaction> getHistory(UUID customerId, UUID orgId) {
        return transactions.findAllByCustomerIdAndOrganizationIdOrderByCreatedAtDesc(
                customerId, orgId);
    }

    /** Force-recalculate the tier based on current total (idempotent). */
    public CustomerReward updateTier(UUID customerId, UUID orgId) {
        CustomerReward reward = getOrCreate(customerId, orgId);
        reward.recalculateTier();
        return rewards.save(reward);
    }
}
