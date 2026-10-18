package com.pawanputra.bos.servicecontract.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily scheduled job that refreshes the renewal status for all active AMC contracts and expires ended warranties.
 * Contracts within 30 days of expiry move to DUE_SOON; expired contracts move to OVERDUE.
 */
@Component
public class AmcRenewalJob {

    private static final Logger log = LoggerFactory.getLogger(AmcRenewalJob.class);

    private final AmcContractService amcContractService;
    private final WarrantyService warrantyService;

    public AmcRenewalJob(AmcContractService amcContractService, WarrantyService warrantyService) {
        this.amcContractService = amcContractService;
        this.warrantyService = warrantyService;
    }

    @Scheduled(cron = "0 0 1 * * *", zone = "${app.finance.time-zone:Asia/Kolkata}") // 01:00 every day, business time
    public void updateRenewalStatuses() {
        log.info("AMC renewal job started");
        try {
            amcContractService.updateRenewalStatuses();
            log.info("AMC renewal job completed successfully");
        } catch (Exception e) {
            log.error("AMC renewal job failed", e);
        }
        // Warranties are kept in step by the same daily run: one that has ended no longer shows as active.
        try {
            int expired = warrantyService.markExpiredWarranties();
            log.info("Warranty expiry run completed: {} warranties expired", expired);
        } catch (Exception e) {
            log.error("Warranty expiry run failed", e);
        }
    }
}
