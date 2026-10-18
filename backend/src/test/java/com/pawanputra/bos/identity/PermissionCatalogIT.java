package com.pawanputra.bos.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** Keeps the seeded roles and permissions, and the constants the code checks against, in step. */
class PermissionCatalogIT extends AbstractIntegrationTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void seededRolesAreExactlyTheThirteenSystemRoles() {
        List<String> seeded = jdbc.queryForList("SELECT code FROM roles WHERE system_role", String.class);

        assertThat(seeded).hasSize(13).containsExactlyInAnyOrderElementsOf(RoleCodes.ALL);
    }

    @Test
    void permissionsTableMatchesThePermissionsConstants() {
        List<String> seeded = jdbc.queryForList("SELECT code FROM permissions", String.class);

        assertThat(seeded).containsExactlyInAnyOrderElementsOf(Permissions.ALL);
    }

    @Test
    void everyPermissionIsNamedModuleAction() {
        assertThat(Permissions.ALL).allMatch(code -> code.matches("[A-Z][A-Z0-9]*(_[A-Z0-9]+)+"));
    }

    @Test
    void superAdminHoldsEveryPermission() {
        assertThat(permissionsOf(RoleCodes.SUPER_ADMIN)).containsExactlyInAnyOrderElementsOf(Permissions.ALL);
    }

    @Test
    void externalRolesStartWithNoPermissions() {
        assertThat(permissionsOf(RoleCodes.VENDOR)).isEmpty();
        assertThat(permissionsOf(RoleCodes.PARTNER)).isEmpty();
    }

    @Test
    void onlySuperAdminMayChangeRoles() {
        List<String> holders = jdbc.queryForList(
                "SELECT r.code FROM roles r JOIN role_permissions rp ON rp.role_id = r.id "
                        + "JOIN permissions p ON p.id = rp.permission_id WHERE p.code = ?",
                String.class, Permissions.ROLE_UPDATE);

        assertThat(holders).containsExactly(RoleCodes.SUPER_ADMIN);
    }

    @Test
    void defaultGrantsFollowTheDocumentedMatrix() {
        assertThat(permissionsOf(RoleCodes.SALES_EXECUTIVE)).containsExactlyInAnyOrder(
                Permissions.CUSTOMER_VIEW, Permissions.CUSTOMER_CREATE, Permissions.CUSTOMER_UPDATE,
                Permissions.LEAD_VIEW, Permissions.LEAD_CREATE, Permissions.LEAD_UPDATE,
                Permissions.CATALOG_VIEW,
                Permissions.ACTIVITY_VIEW, Permissions.ACTIVITY_CREATE, Permissions.ACTIVITY_UPDATE,
                Permissions.OPPORTUNITY_VIEW, Permissions.OPPORTUNITY_CREATE, Permissions.OPPORTUNITY_UPDATE,
                Permissions.QUOTATION_VIEW, Permissions.QUOTATION_CREATE, Permissions.QUOTATION_UPDATE,
                Permissions.ORDER_VIEW, Permissions.ORDER_CREATE, Permissions.ORDER_UPDATE);
        assertThat(permissionsOf(RoleCodes.TECHNICIAN)).containsExactlyInAnyOrder(
                Permissions.PROJECT_VIEW, Permissions.FIELD_JOB_WORK,
                Permissions.PROOF_OF_WORK_VIEW, Permissions.PROOF_OF_WORK_CREATE,
                Permissions.AMC_VIEW, Permissions.WORKFORCE_VIEW,
                Permissions.NOTIFICATION_VIEW, Permissions.DOCUMENT_VIEW,
                Permissions.DOCUMENT_UPLOAD, Permissions.PULSE_VIEW);
        assertThat(permissionsOf(RoleCodes.FINANCE)).containsExactlyInAnyOrder(
                Permissions.FINANCE_VIEW, Permissions.FINANCE_MANAGE, Permissions.FINANCE_APPROVE,
                Permissions.FINANCE_CONFIGURE, Permissions.CUSTOMER_VIEW, Permissions.PROJECT_VIEW,
                Permissions.QUOTATION_VIEW, Permissions.QUOTATION_CREATE, Permissions.QUOTATION_UPDATE, Permissions.QUOTATION_APPROVE,
                Permissions.ORDER_VIEW,
                // added by the receivables (V29), performance (V32) and analytics (V37) modules
                Permissions.RECEIVABLES_VIEW, Permissions.RECEIVABLES_MANAGE,
                Permissions.COMMISSION_VIEW, Permissions.COMMISSION_MANAGE,
                Permissions.ANALYTICS_VIEW);
        assertThat(permissionsOf(RoleCodes.ADMIN))
                .contains(Permissions.USER_UPDATE, Permissions.CATALOG_DELETE)
                .doesNotContain(Permissions.ROLE_UPDATE, Permissions.FINANCE_APPROVE);
    }

    private List<String> permissionsOf(String roleCode) {
        return jdbc.queryForList(
                "SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id "
                        + "JOIN roles r ON r.id = rp.role_id WHERE r.code = ?",
                String.class, roleCode);
    }
}
