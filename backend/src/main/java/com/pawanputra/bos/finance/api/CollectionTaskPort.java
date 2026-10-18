package com.pawanputra.bos.finance.api;

import java.util.UUID;

/**
 * Public port for collection task operations exposed by the finance module.
 */
public interface CollectionTaskPort {

    /**
     * Creates a collection task for the given invoice.
     *
     * @param orgId     organization id
     * @param invoiceId invoice id
     * @param priority  optional priority string (e.g. "HIGH", "MEDIUM", "LOW")
     * @return true if created successfully, false if the invoice was not found
     */
    boolean createCollectionTask(UUID orgId, UUID invoiceId, String priority);
}
