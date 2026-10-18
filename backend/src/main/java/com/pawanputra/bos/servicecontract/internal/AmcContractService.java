package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.servicecontract.api.AmcFrequency;
import com.pawanputra.bos.servicecontract.api.AmcStatus;
import com.pawanputra.bos.servicecontract.api.RenewalStatus;
import com.pawanputra.bos.servicecontract.api.VisitStatus;
import com.pawanputra.bos.servicecontract.api.VisitType;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AmcContractService {

    private static final int DUE_SOON_DAYS = 30;

    private final AmcContractRepository contracts;
    private final AmcServiceVisitRepository visits;
    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final ZoneId zone;

    public AmcContractService(
            AmcContractRepository contracts,
            AmcServiceVisitRepository visits,
            NamedParameterJdbcTemplate jdbc,
            Clock clock,
            @Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        this.contracts = contracts;
        this.visits = visits;
        this.jdbc = jdbc;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    /** Today's date where the business is (see {@code app.finance.time-zone}), not wherever the server happens to run. */
    private LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    /** The names of these employees, by employee id, so a visit can say who is going instead of an id. */
    private Map<UUID, String> employeeNames(UUID organizationId, Collection<UUID> employeeIds) {
        Map<UUID, String> names = new HashMap<>();
        if (employeeIds.isEmpty()) {
            return names;
        }
        jdbc.query("SELECT ep.id, u.full_name FROM employee_profiles ep JOIN users u ON u.id = ep.user_id "
                        + "WHERE ep.organization_id = :org AND ep.id IN (:ids)",
                new MapSqlParameterSource("org", organizationId).addValue("ids", employeeIds),
                rs -> {
                    names.put(rs.getObject(1, UUID.class), rs.getString(2));
                });
        return names;
    }

    /** The contract number and customer name of each contract, by contract id. */
    private record ContractLabel(String contractNumber, String customerName) {
    }

    private Map<UUID, ContractLabel> contractLabels(UUID organizationId, Collection<UUID> contractIds) {
        Map<UUID, ContractLabel> labels = new HashMap<>();
        if (contractIds.isEmpty()) {
            return labels;
        }
        jdbc.query("SELECT c.id, c.contract_number, cu.display_name FROM amc_contracts c "
                        + "LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.organization_id = c.organization_id "
                        + "WHERE c.organization_id = :org AND c.id IN (:ids)",
                new MapSqlParameterSource("org", organizationId).addValue("ids", contractIds),
                rs -> {
                    labels.put(rs.getObject(1, UUID.class), new ContractLabel(rs.getString(2), rs.getString(3)));
                });
        return labels;
    }

    private List<AmcViews.VisitView> visitViews(UUID organizationId, List<AmcServiceVisit> found) {
        Map<UUID, String> employees = employeeNames(organizationId,
                found.stream().map(AmcServiceVisit::getAssignedEmployeeId).filter(Objects::nonNull).distinct().toList());
        Map<UUID, ContractLabel> labels = contractLabels(organizationId,
                found.stream().map(AmcServiceVisit::getContractId).distinct().toList());
        return found.stream().map(v -> {
            ContractLabel label = labels.get(v.getContractId());
            return AmcViews.VisitView.from(v,
                    label == null ? null : label.contractNumber(),
                    label == null ? null : label.customerName(),
                    employees.get(v.getAssignedEmployeeId()));
        }).toList();
    }

    /** The names of these customers, by id, so a contract can say who it is with instead of an id. */
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

    private String firstString(String sql, UUID id, UUID organizationId) {
        if (id == null) {
            return null;
        }
        List<String> found = jdbc.query(sql, new MapSqlParameterSource("id", id).addValue("org", organizationId),
                (rs, n) -> rs.getString(1));
        return found.isEmpty() ? null : found.get(0);
    }

    /** The names behind a contract's ids: its customer, project, service and assigned employee. */
    private AmcViews.Names namesOf(UUID organizationId, AmcContract c) {
        return new AmcViews.Names(
                customerNames(organizationId, List.of(c.getCustomerId())).get(c.getCustomerId()),
                firstString("SELECT title FROM projects WHERE id = :id AND organization_id = :org", c.getProjectId(), organizationId),
                firstString("SELECT name FROM services WHERE id = :id", c.getServiceOfferingId(), organizationId),
                firstString("SELECT u.full_name FROM employee_profiles ep JOIN users u ON u.id = ep.user_id "
                        + "WHERE ep.id = :id AND ep.organization_id = :org", c.getAssignedEmployeeId(), organizationId));
    }

    private List<AmcViews.ContractSummary> summaries(UUID organizationId, List<AmcContract> found) {
        Map<UUID, String> names = customerNames(organizationId, found.stream().map(AmcContract::getCustomerId).distinct().toList());
        return found.stream().map(c -> AmcViews.ContractSummary.from(c, names.get(c.getCustomerId()))).toList();
    }

    public record ContractFilter(AmcStatus status, UUID customerId, Integer expiringInDays) {
    }

    public record CreateContractCommand(
            UUID customerId,
            UUID serviceOfferingId,
            UUID projectId,
            BigDecimal contractValue,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            AmcFrequency frequency,
            UUID assignedEmployeeId,
            UUID slaId,
            String terms,
            String notes) {
    }

    public record UpdateContractCommand(
            UUID customerId,
            UUID serviceOfferingId,
            UUID projectId,
            BigDecimal contractValue,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            AmcFrequency frequency,
            UUID assignedEmployeeId,
            UUID slaId,
            AmcStatus status,
            String terms,
            String notes) {
    }

    public record RenewContractCommand(
            LocalDate newEndDate,
            BigDecimal newContractValue) {
    }

    public record CreateVisitCommand(
            LocalDate scheduledDate,
            VisitType visitType,
            UUID assignedEmployeeId,
            String notes) {
    }

    public record CompleteVisitCommand(
            LocalDate completedDate,
            String outcome,
            VisitStatus status) {
    }

    public AmcViews.ContractDetail create(UUID organizationId, CreateContractCommand cmd, String actor) {
        String contractNumber = generateContractNumber(organizationId);
        AmcContract contract = new AmcContract(
                organizationId,
                contractNumber,
                cmd.customerId(),
                cmd.serviceOfferingId(),
                cmd.projectId(),
                cmd.contractValue(),
                cmd.currency(),
                cmd.startDate(),
                cmd.endDate(),
                cmd.frequency(),
                cmd.assignedEmployeeId(),
                cmd.slaId(),
                cmd.terms(),
                cmd.notes(),
                actor);
        contracts.save(contract);
        return AmcViews.ContractDetail.from(contract, namesOf(organizationId, contract), List.of());
    }

    @Transactional(readOnly = true)
    public AmcViews.ContractDetail getById(UUID organizationId, UUID id) {
        AmcContract contract = findOrThrow(organizationId, id);
        List<AmcViews.VisitView> visitViews = visitViews(organizationId, visits.findByContractIdOrderByScheduledDateAsc(id));
        return AmcViews.ContractDetail.from(contract, namesOf(organizationId, contract), visitViews);
    }

    @Transactional(readOnly = true)
    public Page<AmcViews.ContractSummary> findPage(UUID organizationId, ContractFilter filter, Pageable pageable) {
        Specification<AmcContract> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organizationId"), organizationId));
            if (filter.status() != null) {
                predicates.add(cb.equal(root.get("status"), filter.status()));
            }
            if (filter.customerId() != null) {
                predicates.add(cb.equal(root.get("customerId"), filter.customerId()));
            }
            if (filter.expiringInDays() != null) {
                LocalDate from = today();
                LocalDate to = from.plusDays(filter.expiringInDays());
                predicates.add(cb.between(root.get("endDate"), from, to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<AmcContract> page = contracts.findAll(spec, pageable);
        List<AmcViews.ContractSummary> rows = summaries(organizationId, page.getContent());
        return new org.springframework.data.domain.PageImpl<>(rows, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<AmcViews.ContractSummary> listByCustomer(UUID organizationId, UUID customerId) {
        return summaries(organizationId, contracts.findByOrganizationIdAndCustomerId(organizationId, customerId));
    }

    @Transactional(readOnly = true)
    public List<AmcViews.ContractSummary> listExpiringSoon(UUID organizationId, int days) {
        LocalDate from = today();
        LocalDate to = from.plusDays(days);
        return summaries(organizationId, contracts.findExpiringSoon(organizationId, from, to));
    }

    public AmcViews.ContractDetail update(UUID organizationId, UUID id, UpdateContractCommand cmd, String actor) {
        AmcContract contract = findOrThrow(organizationId, id);
        contract.setCustomerId(cmd.customerId());
        contract.setServiceOfferingId(cmd.serviceOfferingId());
        contract.setProjectId(cmd.projectId());
        contract.setContractValue(cmd.contractValue());
        contract.setCurrency(cmd.currency() != null ? cmd.currency() : contract.getCurrency());
        contract.setStartDate(cmd.startDate());
        contract.setEndDate(cmd.endDate());
        contract.setFrequency(cmd.frequency());
        contract.setAssignedEmployeeId(cmd.assignedEmployeeId());
        contract.setSlaId(cmd.slaId());
        if (cmd.status() != null) {
            contract.setStatus(cmd.status());
        }
        contract.setTerms(cmd.terms());
        contract.setNotes(cmd.notes());
        contract.setUpdatedAt(Instant.now());
        contract.setUpdatedBy(actor);
        contracts.save(contract);
        List<AmcViews.VisitView> visitViews = visitViews(organizationId, visits.findByContractIdOrderByScheduledDateAsc(id));
        return AmcViews.ContractDetail.from(contract, namesOf(organizationId, contract), visitViews);
    }

    public AmcViews.ContractDetail renewContract(UUID organizationId, UUID id, RenewContractCommand cmd, String actor) {
        AmcContract existing = findOrThrow(organizationId, id);
        String newContractNumber = generateContractNumber(organizationId);
        AmcContract renewed = new AmcContract(
                organizationId,
                newContractNumber,
                existing.getCustomerId(),
                existing.getServiceOfferingId(),
                existing.getProjectId(),
                cmd.newContractValue() != null ? cmd.newContractValue() : existing.getContractValue(),
                existing.getCurrency(),
                existing.getEndDate().plusDays(1),
                cmd.newEndDate(),
                existing.getFrequency(),
                existing.getAssignedEmployeeId(),
                existing.getSlaId(),
                existing.getTerms(),
                existing.getNotes(),
                actor);
        renewed.setRenewedFromId(existing.getId());
        renewed.setStatus(AmcStatus.ACTIVE);
        renewed.setRenewalStatus(RenewalStatus.NOT_DUE);
        contracts.save(renewed);

        existing.setRenewalStatus(RenewalStatus.RENEWED);
        existing.setStatus(AmcStatus.EXPIRED);
        existing.setUpdatedAt(Instant.now());
        existing.setUpdatedBy(actor);
        contracts.save(existing);

        return AmcViews.ContractDetail.from(renewed, namesOf(organizationId, renewed), List.of());
    }

    public AmcViews.VisitView addVisit(UUID organizationId, UUID contractId, CreateVisitCommand cmd) {
        findOrThrow(organizationId, contractId);
        AmcServiceVisit visit = new AmcServiceVisit(
                contractId,
                cmd.scheduledDate(),
                cmd.visitType(),
                cmd.assignedEmployeeId(),
                cmd.notes());
        visits.save(visit);
        return visitViews(organizationId, List.of(visit)).get(0);
    }

    @Transactional(readOnly = true)
    public List<AmcViews.VisitView> listVisits(UUID organizationId, UUID contractId) {
        findOrThrow(organizationId, contractId);
        return visitViews(organizationId, visits.findByContractIdOrderByScheduledDateAsc(contractId));
    }

    public AmcViews.VisitView updateVisit(UUID organizationId, UUID visitId, CompleteVisitCommand cmd) {
        AmcServiceVisit visit = visits.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("AmcServiceVisit", visitId.toString()));
        // A visit has no organization of its own: it belongs to a contract. Another organization's visit is "not found".
        if (contracts.findByIdAndOrganizationId(visit.getContractId(), organizationId).isEmpty()) {
            throw new ResourceNotFoundException("AmcServiceVisit", visitId.toString());
        }
        if (cmd.completedDate() != null) {
            visit.setCompletedDate(cmd.completedDate());
        }
        if (cmd.outcome() != null) {
            visit.setOutcome(cmd.outcome());
        }
        if (cmd.status() != null) {
            visit.setStatus(cmd.status());
        }
        visit.setUpdatedAt(Instant.now());
        visits.save(visit);
        return visitViews(organizationId, List.of(visit)).get(0);
    }

    @Transactional(readOnly = true)
    public List<AmcViews.VisitView> listUpcomingVisits(UUID organizationId, int days) {
        LocalDate from = today();
        LocalDate to = from.plusDays(days);
        return visitViews(organizationId, visits.findUpcomingVisits(organizationId, from, to));
    }

    public AmcViews.Dashboard getDashboard(UUID organizationId) {
        long totalActive = contracts.countByOrganizationIdAndStatus(organizationId, AmcStatus.ACTIVE);
        List<AmcViews.ContractSummary> expiringSoonList = listExpiringSoon(organizationId, DUE_SOON_DAYS);
        List<AmcViews.VisitView> upcomingVisitsList = listUpcomingVisits(organizationId, 30);
        long overdueRenewals = contracts.countByOrganizationIdAndStatus(organizationId, AmcStatus.RENEWAL_PENDING);
        return new AmcViews.Dashboard(
                totalActive,
                expiringSoonList.size(),
                overdueRenewals,
                upcomingVisitsList.size(),
                expiringSoonList,
                upcomingVisitsList);
    }

    public void updateRenewalStatuses() {
        List<AmcContract> active = contracts.findAllActiveForRenewalCheck();
        LocalDate today = today();
        for (AmcContract c : active) {
            RenewalStatus newStatus = calculateRenewalStatus(c, today);
            if (newStatus != c.getRenewalStatus()) {
                c.setRenewalStatus(newStatus);
                if (newStatus == RenewalStatus.OVERDUE && c.getStatus() == AmcStatus.ACTIVE) {
                    c.setStatus(AmcStatus.RENEWAL_PENDING);
                }
                c.setUpdatedAt(Instant.now());
                c.setUpdatedBy("system");
            }
        }
        contracts.saveAll(active);
    }

    private RenewalStatus calculateRenewalStatus(AmcContract c, LocalDate today) {
        if (c.getRenewalStatus() == RenewalStatus.RENEWED) {
            return RenewalStatus.RENEWED;
        }
        LocalDate endDate = c.getEndDate();
        if (endDate.isBefore(today)) {
            return RenewalStatus.OVERDUE;
        }
        if (endDate.minusDays(DUE_SOON_DAYS).isBefore(today) || endDate.minusDays(DUE_SOON_DAYS).isEqual(today)) {
            return RenewalStatus.DUE_SOON;
        }
        return RenewalStatus.NOT_DUE;
    }

    private String generateContractNumber(UUID organizationId) {
        int year = today().getYear();
        String prefix = "AMC-" + year + "-";
        long count = contracts.count() + 1;
        return prefix + String.format("%04d", count);
    }

    private AmcContract findOrThrow(UUID organizationId, UUID id) {
        return contracts.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("AmcContract", id.toString()));
    }
}
