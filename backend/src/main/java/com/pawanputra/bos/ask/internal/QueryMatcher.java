package com.pawanputra.bos.ask.internal;

import com.pawanputra.bos.ask.api.AskTool;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;

/**
 * Matches a typed question to one of the known questions by keywords. This is deliberately simple and
 * predictable (no language model): the more specific questions are tried first, and anything that matches
 * none of them is answered with the list of questions that can be asked.
 */
@Component
public class QueryMatcher {

    private record Rule(AskTool tool, Predicate<String> matches) {
    }

    private static boolean any(String q, String... words) {
        for (String word : words) {
            if (q.contains(word)) {
                return true;
            }
        }
        return false;
    }

    private static final List<Rule> RULES = List.of(
            new Rule(AskTool.GET_DELAYED_PROJECTS, q -> any(q, "delayed") || (q.contains("project") && any(q, "delay", "late", "overdue", "behind"))),
            new Rule(AskTool.GET_OVERDUE_INVOICES, q -> any(q, "overdue invoice", "unpaid", "outstanding", "receivable") || (q.contains("invoice") && any(q, "overdue", "late", "owing")) || q.matches(".*\\bowe\\b.*")),
            new Rule(AskTool.GET_MONEY_THIS_MONTH, q -> any(q, "revenue", "collect", "invoice", "cash", "money", "income", "billing")),
            new Rule(AskTool.GET_PIPELINE_VALUE, q -> any(q, "pipeline value", "forecast", "deals", "worth of", "weighted")),
            new Rule(AskTool.GET_LEADS_PIPELINE, q -> any(q, "lead", "pipeline", "prospect")),
            new Rule(AskTool.GET_EXPIRING_AMCS, q -> any(q, "amc", "contract", "expir", "renewal", "renew")),
            new Rule(AskTool.GET_TODAYS_TASKS, q -> any(q, "task", "today", "follow", "todo", "to-do", "my day")),
            new Rule(AskTool.GET_OPEN_TICKETS, q -> any(q, "ticket", "support", "issue", "complaint")));

    public AskTool match(String question) {
        String q = question == null ? "" : question.toLowerCase();
        return RULES.stream().filter(rule -> rule.matches().test(q)).map(Rule::tool).findFirst().orElse(AskTool.UNKNOWN);
    }
}
