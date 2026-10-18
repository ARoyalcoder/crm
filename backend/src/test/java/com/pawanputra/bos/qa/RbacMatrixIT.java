package com.pawanputra.bos.qa;

import static org.assertj.core.api.Assertions.assertThat;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import java.lang.reflect.Array;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Exhaustive role x endpoint authorization audit.
 *
 * <p>For every {@code /api/v1} endpoint and every system role it (1) evaluates the endpoint's
 * {@code @PreAuthorize} expression against the role's REAL grants in the database, and (2) invokes the
 * endpoint through the Spring security proxy as that role and checks the guard actually allowed or
 * refused it. So a guard that is missing, written wrongly, or bypassed by how the bean is wired shows
 * up here, whatever the frontend hides.
 *
 * <p>Invocation uses empty arguments: method security runs before the controller body, so a refused
 * call never reaches it, and an allowed call fails harmlessly on the empty input inside a throw-away
 * schema. Endpoints without any guard must be on {@link #OPEN_TO_ANY_AUTHENTICATED_USER} or
 * {@link #PUBLIC}, so a newly added unguarded endpoint fails this test.
 *
 * <p>The full matrix is written to {@code target/qa/rbac-matrix.tsv}.
 */
class RbacMatrixIT extends AbstractIntegrationTest {

    /** Reachable without a token (see SecurityConfig). */
    static final Set<String> PUBLIC = Set.of(
            "GET /api/v1/system/info",
            "GET /api/v1/service-verticals",
            "GET /api/v1/service-verticals/{code}",
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/refresh",
            "POST /api/v1/auth/logout",
            "POST /api/v1/auth/password/forgot",
            "POST /api/v1/auth/password/reset");

    /** Self-service on the caller's own account; deliberately needs a token but no permission. */
    static final Set<String> OPEN_TO_ANY_AUTHENTICATED_USER = Set.of(
            "GET /api/v1/auth/me",
            "POST /api/v1/auth/password/change",
            "GET /api/v1/auth/sessions",
            "DELETE /api/v1/auth/sessions/{sessionId}",
            // The caller's own work: only ever the caller's records, and each block is checked against the module it comes from.
            "GET /api/v1/analytics/my-work");

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping mapping;

    @Autowired
    JdbcTemplate jdbc;

    static final Map<String, Integer> OUTCOMES = new java.util.concurrent.ConcurrentHashMap<>();

    record Endpoint(String key, Method method, Object bean, String expression) {
    }

    /** SpEL root exposing the same expression functions Spring Security does. */
    public static final class Root {
        private final Set<String> authorities;

        Root(Set<String> authorities) {
            this.authorities = authorities;
        }

        public boolean hasAuthority(String a) {
            return authorities.contains(a);
        }

        public boolean hasAnyAuthority(String... a) {
            return Arrays.stream(a).anyMatch(authorities::contains);
        }

        public boolean hasRole(String r) {
            return authorities.contains("ROLE:" + r);
        }

        public boolean hasAnyRole(String... r) {
            return Arrays.stream(r).anyMatch(this::hasRole);
        }

        public boolean isAuthenticated() {
            return true;
        }

        public boolean permitAll() {
            return true;
        }

        public boolean denyAll() {
            return false;
        }
    }

    @Test
    void everyEndpointAuthorizationMatchesTheRoleGrantsInTheDatabase() throws Exception {
        List<Endpoint> guarded = new ArrayList<>();
        Set<String> unguarded = new TreeSet<>();
        collectEndpoints(guarded, unguarded);

        // 1. No endpoint may be silently open: anything unguarded must be on an explicit list.
        Set<String> allowed = new TreeSet<>(PUBLIC);
        allowed.addAll(OPEN_TO_ANY_AUTHENTICATED_USER);
        Set<String> unexpectedlyOpen = new TreeSet<>(unguarded);
        unexpectedlyOpen.removeAll(allowed);
        assertThat(unexpectedlyOpen)
                .as("endpoints with no @PreAuthorize that are not on the public / self-service lists")
                .isEmpty();

        // 2. Role x endpoint matrix: SpEL expectation against real grants vs what the proxy does.
        Map<String, Set<String>> authoritiesByRole = new LinkedHashMap<>();
        for (String role : roles()) {
            Set<String> a = new TreeSet<>(jdbc.queryForList(
                    "SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id "
                            + "JOIN roles r ON r.id = rp.role_id WHERE r.code = ?", String.class, role));
            a.add("ROLE:" + role);
            authoritiesByRole.put(role, a);
        }

        ExpressionParser parser = new SpelExpressionParser();
        List<String> mismatches = new ArrayList<>();
        List<String> unevaluable = new ArrayList<>();
        Map<String, Map<String, String>> matrix = new TreeMap<>();
        Map<String, String> expressions = new TreeMap<>();

        for (Endpoint e : guarded) {
            for (Map.Entry<String, Set<String>> role : authoritiesByRole.entrySet()) {
                Boolean expected;
                try {
                    expected = parser.parseExpression(e.expression())
                            .getValue(new StandardEvaluationContext(new Root(role.getValue())), Boolean.class);
                } catch (RuntimeException ex) {
                    unevaluable.add(e.key() + " :: " + e.expression());
                    break;
                }
                expressions.put(e.key(), e.expression());
                boolean actual = invokeAllowed(e, role.getValue());
                matrix.computeIfAbsent(e.key(), k -> new LinkedHashMap<>())
                        .put(role.getKey(), Boolean.TRUE.equals(actual) ? "ALLOW" : "DENY");
                if (!Boolean.valueOf(actual).equals(expected)) {
                    mismatches.add(e.key() + " as " + role.getKey() + ": expression says "
                            + (expected ? "ALLOW" : "DENY") + " but the proxy " + (actual ? "ALLOWED" : "DENIED")
                            + "  [" + e.expression() + "]");
                }
            }
        }
        writeMatrix(matrix, expressions);

        assertThat(unevaluable).as("expressions this audit cannot evaluate (extend Root)").isEmpty();
        assertThat(mismatches).as("guard behaviour differs from its own @PreAuthorize expression").isEmpty();
    }

    @Test
    void zeroPermissionExternalRolesAreRefusedEverywhereExceptTheirOwnAccount() throws Exception {
        List<Endpoint> guarded = new ArrayList<>();
        collectEndpoints(guarded, new TreeSet<>());

        List<String> leaks = new ArrayList<>();
        for (String role : List.of(RoleCodes.VENDOR, RoleCodes.PARTNER)) {
            Set<String> authorities = Set.of("ROLE:" + role);
            for (Endpoint e : guarded) {
                if (invokeAllowed(e, authorities)) {
                    leaks.add(role + " can call " + e.key() + "  [" + e.expression() + "]");
                }
            }
        }
        System.out.println("QA-OUTCOMES " + new TreeMap<>(OUTCOMES));
        assertThat(leaks)
                .as("VENDOR and PARTNER hold no permissions, so no guarded endpoint may admit them")
                .isEmpty();
    }

    // ------------------------------------------------------------------------------------------

    private List<String> roles() {
        return new ArrayList<>(new TreeSet<>(RoleCodes.ALL));
    }

    private void collectEndpoints(List<Endpoint> guarded, Set<String> unguarded) {
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : mapping.getHandlerMethods().entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod handler = entry.getValue();
            if (info.getPathPatternsCondition() == null) {
                continue;
            }
            Set<String> patterns = info.getPathPatternsCondition().getPatternValues();
            Set<RequestMethod> verbs = info.getMethodsCondition().getMethods();
            if (verbs.isEmpty()) {
                verbs = Set.of(RequestMethod.GET);
            }
            Method method = handler.getMethod();
            PreAuthorize guard = AnnotatedElementUtils.findMergedAnnotation(method, PreAuthorize.class);
            if (guard == null) {
                guard = AnnotatedElementUtils.findMergedAnnotation(handler.getBeanType(), PreAuthorize.class);
            }
            for (String pattern : patterns) {
                if (!pattern.startsWith("/api/v1")) {
                    continue;
                }
                for (RequestMethod verb : verbs) {
                    String key = verb + " " + pattern;
                    if (guard == null) {
                        unguarded.add(key);
                    } else {
                        // getBean() is only the bean NAME for a lazily resolved handler; the guard lives on the real (proxied) bean.
                        guarded.add(new Endpoint(key, method, handler.createWithResolvedBean().getBean(), guard.value()));
                    }
                }
            }
        }
        assertThat(guarded.size() + unguarded.size()).as("endpoints discovered").isGreaterThan(300);
    }

    /** True when method security let the call through (the body may then fail on the empty input). */
    private boolean invokeAllowed(Endpoint endpoint, Set<String> authorities) {
        SecurityContext previous = SecurityContextHolder.getContext();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "qa-subject", "n/a", authorities.stream().map(SimpleGrantedAuthority::new).toList()));
        SecurityContextHolder.setContext(context);
        try {
            endpoint.method().setAccessible(true);
            endpoint.method().invoke(endpoint.bean(), emptyArguments(endpoint.method()));
            return true;
        } catch (InvocationTargetException ex) {
            OUTCOMES.merge("invoke-threw:" + ex.getCause().getClass().getSimpleName(), 1, Integer::sum);
            return !(ex.getCause() instanceof AccessDeniedException);
        } catch (ReflectiveOperationException | RuntimeException ex) {
            OUTCOMES.merge("harness:" + ex.getClass().getSimpleName() + " " + String.valueOf(ex.getMessage()).substring(0, Math.min(90, String.valueOf(ex.getMessage()).length())) + " bean=" + endpoint.bean().getClass().getSimpleName(), 1, Integer::sum);
            return true; // reached the call but could not run it: the guard did not refuse
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }

    private static Object[] emptyArguments(Method method) {
        Class<?>[] types = method.getParameterTypes();
        Object[] args = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            args[i] = types[i].isPrimitive() ? Array.get(Array.newInstance(types[i], 1), 0) : null;
        }
        return args;
    }

    private void writeMatrix(Map<String, Map<String, String>> matrix, Map<String, String> expressions) throws Exception {
        Path out = Path.of("target", "qa", "rbac-matrix.tsv");
        Files.createDirectories(out.getParent());
        List<String> roles = roles();
        StringBuilder sb = new StringBuilder("endpoint\t").append(String.join("\t", roles)).append('\n');
        matrix.forEach((endpoint, byRole) -> {
            sb.append(endpoint);
            roles.forEach(r -> sb.append('\t').append(byRole.getOrDefault(r, "?")));
            sb.append('\n');
        });
        Files.writeString(out, sb.toString());
    }
}
