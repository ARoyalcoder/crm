package com.pawanputra.bos.ask.api;

/** The questions Ask PAWAN can answer. Each one reads one kind of record and is only offered to people who may see it. */
public enum AskTool {
    GET_DELAYED_PROJECTS,
    GET_OVERDUE_INVOICES,
    GET_LEADS_PIPELINE,
    GET_EXPIRING_AMCS,
    GET_TODAYS_TASKS,
    GET_OPEN_TICKETS,
    GET_MONEY_THIS_MONTH,
    GET_PIPELINE_VALUE,
    UNKNOWN
}
