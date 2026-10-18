package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.servicecontract.api.WarrantyStatus;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WarrantyService {

    private final WarrantyRepository warranties;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final ZoneId zone;

    public WarrantyService(
            WarrantyRepository warranties,
            NamedParameterJdbcTemplate jdbc,
            Clock clock,
            @Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        this.jdbc = jdbc;
        this.warranties = warranties;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    public record CreateWarrantyCommand(
            UUID customerId,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            String description,
            String terms,
            LocalDate startDate,
            LocalDate endDate) {
    }

    public record UpdateWarrantyCommand(
            UUID customerId,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            String description,
            String terms,
            LocalDate startDate,
            LocalDate endDate,
            WarrantyStatus status) {
    }

    /** The names of these customers, by id, so a warranty can say who it is for instead of an id. */
    private Map<UUID, String> customerNames(UUID organizationId, Collection<UUID> customerIds) {
        Map<UUID, String> names = new HashMap<>();
        if (customerIds.isEmpty()) {
            return names;
        }
        jdbc.query("SELECT id, display_name FROM customers WHERE organization_id = :org AND id IN (:ids)",
                new MapSqlParameterSource("org", organizationId).addValue("ids", customerIds),
                rs -> {
                    names.put(rs.getObject(1, UUID.class), rs.getString(2));
                });
        return names;
    }

    private String customerName(UUID organizationId, UUID customerId) {
        return customerNames(organizationId, List.of(customerId)).get(customerId);
    }

    private List<WarrantyViews.Summary> summaries(UUID organizationId, Collection<Warranty> found) {
        Map<UUID, String> names = customerNames(organizationId, found.stream().map(Warranty::getCustomerId).distinct().toList());
        return found.stream().map(w -> WarrantyViews.Summary.from(w, names.get(w.getCustomerId()))).toList();
    }

    public WarrantyViews.Detail create(UUID organizationId, CreateWarrantyCommand cmd, String actor) {
        Warranty warranty = new Warranty(
                organizationId,
                cmd.customerId(),
                cmd.orderId(),
                cmd.projectId(),
                cmd.serviceOfferingId(),
                cmd.description(),
                cmd.terms(),
                cmd.startDate(),
                cmd.endDate(),
                actor);
        warranties.save(warranty);
        return WarrantyViews.Detail.from(warranty, customerName(organizationId, warranty.getCustomerId()));
    }

    @Transactional(readOnly = true)
    public WarrantyViews.Detail getById(UUID organizationId, UUID id) {
        Warranty warranty = findOrThrow(organizationId, id);
        return WarrantyViews.Detail.from(warranty, customerName(organizationId, warranty.getCustomerId()));
    }

    @Transactional(readOnly = true)
    public Page<WarrantyViews.Summary> findPage(UUID organizationId, Pageable pageable) {
        Page<Warranty> page = warranties.findByOrganizationId(organizationId, pageable);
        return new PageImpl<>(summaries(organizationId, page.getContent()), pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public WarrantyViews.CustomerWarranties listByCustomer(UUID organizationId, UUID customerId) {
        List<Warranty> list = warranties.findByOrganizationIdAndCustomerId(organizationId, customerId);
        List<WarrantyViews.Summary> summaries = summaries(organizationId, list);
        long activeCount = list.stream().filter(w -> w.getStatus() == WarrantyStatus.ACTIVE).count();
        long expiredCount = list.stream().filter(w -> w.getStatus() == WarrantyStatus.EXPIRED).count();
        return new WarrantyViews.CustomerWarranties(customerId, summaries, activeCount, expiredCount);
    }

    public WarrantyViews.Detail update(UUID organizationId, UUID id, UpdateWarrantyCommand cmd, String actor) {
        Warranty warranty = findOrThrow(organizationId, id);
        warranty.setCustomerId(cmd.customerId());
        warranty.setOrderId(cmd.orderId());
        warranty.setProjectId(cmd.projectId());
        warranty.setServiceOfferingId(cmd.serviceOfferingId());
        warranty.setDescription(cmd.description());
        warranty.setTerms(cmd.terms());
        warranty.setStartDate(cmd.startDate());
        warranty.setEndDate(cmd.endDate());
        if (cmd.status() != null) {
            warranty.setStatus(cmd.status());
        }
        warranty.setUpdatedAt(java.time.Instant.now());
        warranty.setUpdatedBy(actor);
        warranties.save(warranty);
        return WarrantyViews.Detail.from(warranty, customerName(organizationId, warranty.getCustomerId()));
    }

    public void delete(UUID organizationId, UUID id) {
        Warranty warranty = findOrThrow(organizationId, id);
        warranties.delete(warranty);
    }

    /**
     * Moves every active warranty whose end date has passed to EXPIRED. A warranty is in force through its end date, and
     * "passed" is judged on the business calendar (see {@code app.finance.time-zone}), not the server's.
     *
     * @return how many warranties were expired
     */
    public int markExpiredWarranties() {
        List<Warranty> expired = warranties.findByStatusAndEndDateBefore(
                WarrantyStatus.ACTIVE, LocalDate.now(clock.withZone(zone)));
        expired.forEach(w -> {
            w.setStatus(WarrantyStatus.EXPIRED);
            w.setUpdatedAt(java.time.Instant.now());
            w.setUpdatedBy("system");
        });
        warranties.saveAll(expired);
        return expired.size();
    }

    private Warranty findOrThrow(UUID organizationId, UUID id) {
        return warranties.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Warranty", id.toString()));
    }
}
