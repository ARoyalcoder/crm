package com.pawanputra.bos.rewards.api;

/** Whether a reward transaction adds or removes points, or is an administrative adjustment. */
public enum RewardTransactionType {
    EARNED,
    REDEEMED,
    ADJUSTED,
    EXPIRED
}
