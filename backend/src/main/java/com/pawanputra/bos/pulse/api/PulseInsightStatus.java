package com.pawanputra.bos.pulse.api;

/** Lifecycle state of a single {@code PulseInsight}. */
public enum PulseInsightStatus {

    /** Visible in the feed; not yet acted upon or dismissed. */
    ACTIVE,

    /** The user chose to hide it without taking action. */
    DISMISSED,

    /** The user marked it as acted upon. */
    ACTIONED,
}
