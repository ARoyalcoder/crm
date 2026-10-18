package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.pulse.api.PulseInsightStatus;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Every read that serves a person takes the entity types they may see ({@code types}), so an insight about a
 * record someone has no right to is never selected for them (see {@link PulseVisibility}). Insights about no
 * particular record (null entity type) are open to everyone who may open the feed.
 */
public interface PulseInsightRepository extends JpaRepository<PulseInsight, UUID> {

    String VISIBLE = "p.organizationId = :orgId AND p.status = :status AND (p.entityType IS NULL OR p.entityType IN :types)";

    /** The feed: this person's own action items first, then the rest, most urgent first. */
    @Query(value = "SELECT p FROM PulseInsight p WHERE " + VISIBLE
            + " ORDER BY CASE WHEN p.whoShouldAct = :userId THEN 0 ELSE 1 END, p.score DESC, p.generatedAt DESC",
            countQuery = "SELECT COUNT(p) FROM PulseInsight p WHERE " + VISIBLE)
    Page<PulseInsight> feed(@Param("orgId") UUID orgId, @Param("userId") UUID userId, @Param("status") PulseInsightStatus status,
            @Param("types") Collection<String> types, Pageable pageable);

    @Query(value = "SELECT p FROM PulseInsight p WHERE " + VISIBLE + " AND p.type = :type"
            + " ORDER BY CASE WHEN p.whoShouldAct = :userId THEN 0 ELSE 1 END, p.score DESC, p.generatedAt DESC",
            countQuery = "SELECT COUNT(p) FROM PulseInsight p WHERE " + VISIBLE + " AND p.type = :type")
    Page<PulseInsight> feedOfType(@Param("orgId") UUID orgId, @Param("userId") UUID userId, @Param("status") PulseInsightStatus status,
            @Param("types") Collection<String> types, @Param("type") PulseInsightType type, Pageable pageable);

    @Query("SELECT p.type, COUNT(p) FROM PulseInsight p WHERE " + VISIBLE + " GROUP BY p.type")
    List<Object[]> countByType(@Param("orgId") UUID orgId, @Param("status") PulseInsightStatus status, @Param("types") Collection<String> types);

    /** One insight, only if this person may see it. */
    @Query("SELECT p FROM PulseInsight p WHERE p.id = :id AND p.organizationId = :orgId AND (p.entityType IS NULL OR p.entityType IN :types)")
    Optional<PulseInsight> findVisible(@Param("id") UUID id, @Param("orgId") UUID orgId, @Param("types") Collection<String> types);

    /** Every insight in a state, for the engines to reconcile against what they now find. */
    List<PulseInsight> findAllByOrganizationIdAndStatus(UUID organizationId, PulseInsightStatus status);

    Optional<PulseInsight> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
