package com.pawanputra.bos.finance.internal;

import com.pawanputra.bos.finance.api.CollectionTaskPort;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default implementation of {@link CollectionTaskPort}.
 */
@Service
public class DefaultCollectionTaskPort implements CollectionTaskPort {

    private static final Logger log = LoggerFactory.getLogger(DefaultCollectionTaskPort.class);

    private final InvoiceRepository invoiceRepository;
    private final CollectionTaskRepository collectionTaskRepository;

    public DefaultCollectionTaskPort(
            InvoiceRepository invoiceRepository,
            CollectionTaskRepository collectionTaskRepository) {
        this.invoiceRepository = invoiceRepository;
        this.collectionTaskRepository = collectionTaskRepository;
    }

    @Override
    @Transactional
    public boolean createCollectionTask(UUID orgId, UUID invoiceId, String priority) {
        var invoiceOpt = invoiceRepository.findById(invoiceId);
        if (invoiceOpt.isEmpty()) {
            return false;
        }
        var invoice = invoiceOpt.get();

        CollectionTask task = new CollectionTask(orgId, invoiceId, invoice.getCustomerId());
        if (priority != null) {
            try {
                task.setPriority(CollectionTask.Priority.valueOf(priority.toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Unknown collection task priority: {}, using default", priority);
            }
        }

        collectionTaskRepository.save(task);
        log.info("[FINANCE] Created collection task for invoice {}", invoiceId);
        return true;
    }
}
