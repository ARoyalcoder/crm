package com.pawanputra.bos.ask.internal;

import java.util.List;

/**
 * An answer: what was asked, the answer in a sentence, why that is the answer, the records behind it (the first
 * few of however many there are; {@code totalRecords} says how many), and where to go next.
 */
public record AskResponse(
        String question,
        String answer,
        String reasoning,
        List<AskRecord> supportingRecords,
        long totalRecords,
        String recommendedAction,
        String recommendedActionUrl) {

    /** One record behind an answer, ready to show: a title, a line of detail and where to open it. */
    public record AskRecord(String id, String title, String detail, String url) {
    }
}
