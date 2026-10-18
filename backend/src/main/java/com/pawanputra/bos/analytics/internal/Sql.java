package com.pawanputra.bos.analytics.internal;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Small helpers shared by the metric queries. */
final class Sql {

    private Sql() {
    }

    /** An amount with its two decimals; an empty sum (null) is zero. Every amount leaves the analytics API in this form. */
    static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }

    /** A percentage (0-100) of {@code part} in {@code whole} with one decimal; null when there is no whole. */
    static BigDecimal percent(long part, long whole) {
        if (whole <= 0) {
            return null;
        }
        return BigDecimal.valueOf(part * 100.0 / whole).setScale(1, RoundingMode.HALF_UP);
    }
}
