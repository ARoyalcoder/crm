package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.pulse.api.PulseInsightCategory;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.UUID;

/** Small helpers the engines share: building an insight and writing amounts the way people here read them. */
final class Insights {

    private static final Locale INDIA = Locale.of("en", "IN");

    private Insights() {
    }

    /** An insight about one record. The owner is who should act, or null when nobody in particular owns the record. */
    static PulseInsight about(UUID org, PulseInsightType type, PulseInsightCategory category, String entityType, UUID entityId, String entityLabel,
            int score, String title, String happened, String why, String todo, String impact, UUID ownerId, String ownerName) {
        PulseInsight insight = new PulseInsight(org, type, category);
        insight.setEntityType(entityType);
        insight.setEntityId(entityId);
        insight.setEntityLabel(trim(entityLabel, 255));
        insight.setScore(Math.max(0, Math.min(100, score)));
        insight.setTitle(trim(title, 255));
        insight.setWhatHappened(happened);
        insight.setWhyItMatters(why);
        insight.setWhatToDo(todo);
        insight.setExpectedImpact(impact);
        if (ownerId != null) {
            insight.setWhoShouldAct(ownerId);
            insight.setWhoShouldActLabel(trim(ownerName, 200));
        }
        return insight;
    }

    /** Whole rupees with lakh and crore grouping: ₹12,34,567. */
    static String inr(BigDecimal amount) {
        if (amount == null) {
            return "₹0";
        }
        NumberFormat format = NumberFormat.getIntegerInstance(INDIA);
        return "₹" + format.format(amount.setScale(0, RoundingMode.HALF_UP));
    }

    /** Urgency grows with how late something is, from {@code base} by one point per {@code perDays} days, up to {@code cap}. */
    static int scale(int base, long days, int perDays, int cap) {
        return (int) Math.min(cap, base + days / Math.max(1, perDays));
    }

    private static String trim(String text, int max) {
        if (text == null) {
            return null;
        }
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
