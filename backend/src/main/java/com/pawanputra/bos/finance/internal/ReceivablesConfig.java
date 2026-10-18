package com.pawanputra.bos.finance.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * One configuration record per organization. Defines how many days overdue triggers a collection
 * task and when an escalation notification should be sent.
 */
@Entity
@Table(name = "receivables_config")
public class ReceivablesConfig extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    /** Days overdue before a collection task is auto-created. */
    @Column(name = "overdue_days_1", nullable = false)
    private int overdueDays1 = 3;

    /** Days overdue before an escalation notice is triggered. */
    @Column(name = "overdue_days_2", nullable = false)
    private int overdueDays2 = 15;

    @Column(name = "collection_task_enabled", nullable = false)
    private boolean collectionTaskEnabled = true;

    @Column(name = "escalation_enabled", nullable = false)
    private boolean escalationEnabled = true;

    /** The finance manager to notify when escalation fires; {@code null} if not configured. */
    @Column(name = "escalation_user_id")
    private UUID escalationUserId;

    protected ReceivablesConfig() {
        // for JPA
    }

    public ReceivablesConfig(UUID organizationId) {
        this.organizationId = organizationId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public int getOverdueDays1() {
        return overdueDays1;
    }

    public void setOverdueDays1(int overdueDays1) {
        this.overdueDays1 = overdueDays1;
    }

    public int getOverdueDays2() {
        return overdueDays2;
    }

    public void setOverdueDays2(int overdueDays2) {
        this.overdueDays2 = overdueDays2;
    }

    public boolean isCollectionTaskEnabled() {
        return collectionTaskEnabled;
    }

    public void setCollectionTaskEnabled(boolean collectionTaskEnabled) {
        this.collectionTaskEnabled = collectionTaskEnabled;
    }

    public boolean isEscalationEnabled() {
        return escalationEnabled;
    }

    public void setEscalationEnabled(boolean escalationEnabled) {
        this.escalationEnabled = escalationEnabled;
    }

    public UUID getEscalationUserId() {
        return escalationUserId;
    }

    public void setEscalationUserId(UUID escalationUserId) {
        this.escalationUserId = escalationUserId;
    }
}
