package com.pawanputra.bos.workforce.web;

import com.pawanputra.bos.workforce.internal.EmployeeProfile;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Turns employee profiles into what the API returns, adding who each one is (the name and email of the user
 * account it belongs to), looked up for the whole list in one query.
 */
@Component
class EmployeeViewFactory {

    private final NamedParameterJdbcTemplate jdbc;

    EmployeeViewFactory(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    WorkforceViews.EmployeeProfileView view(EmployeeProfile profile) {
        return views(List.of(profile)).get(0);
    }

    List<WorkforceViews.EmployeeProfileView> views(Collection<EmployeeProfile> profiles) {
        Map<UUID, WorkforceViews.Person> people = new HashMap<>();
        if (!profiles.isEmpty()) {
            jdbc.query("SELECT id, full_name, email FROM users WHERE id IN (:ids)",
                    new MapSqlParameterSource("ids", profiles.stream().map(EmployeeProfile::getUserId).distinct().toList()),
                    rs -> {
                        people.put(rs.getObject(1, UUID.class), new WorkforceViews.Person(rs.getString(2), rs.getString(3)));
                    });
        }
        return profiles.stream().map(p -> WorkforceViews.EmployeeProfileView.from(p, people.get(p.getUserId()))).toList();
    }

    /** Active or invited users of the organization who have no employee profile yet, by name. */
    List<WorkforceViews.UserOption> usersWithoutProfile(UUID organizationId) {
        return jdbc.query(
                "SELECT u.id, u.full_name, u.email FROM users u WHERE u.organization_id = :org AND u.deleted_at IS NULL "
                        + "AND u.status IN ('ACTIVE', 'INVITED') "
                        + "AND NOT EXISTS (SELECT 1 FROM employee_profiles ep WHERE ep.user_id = u.id) ORDER BY u.full_name",
                new MapSqlParameterSource("org", organizationId),
                (rs, n) -> new WorkforceViews.UserOption(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)));
    }
}
