package com.pawanputra.bos.identity.internal;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.identity.api.SessionRevocationReason;
import com.pawanputra.bos.identity.api.UserStatus;
import com.pawanputra.bos.platform.error.BusinessRuleException;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Switching accounts on and off, and creating new users. Callers must hold USER_CREATE or USER_UPDATE. */
@Service
public class UserAccountService {

    private static final Logger log = LoggerFactory.getLogger(UserAccountService.class);

    private final UserRepository users;
    private final SessionService sessionService;
    private final RoleRepository roles;
    private final OrganizationRepository organizations;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public UserAccountService(
            UserRepository users,
            SessionService sessionService,
            RoleRepository roles,
            OrganizationRepository organizations,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.users = users;
        this.sessionService = sessionService;
        this.roles = roles;
        this.organizations = organizations;
        this.passwordEncoder = passwordEncoder;
    }

    /** Creates a new active user with an encoded password and assigns the given role. */
    @Transactional
    public User create(String email, String fullName, String password, String roleCode, CurrentUser actor) {
        String normalizedEmail = User.normalizeEmail(email);
        if (users.existsByEmail(normalizedEmail)) {
            throw new BusinessRuleException("A user with email " + email + " already exists.");
        }
        Role role = roles.findByCode(roleCode)
                .orElseThrow(() -> new BusinessRuleException("Role not found: " + roleCode));
        Organization org = organizations.findById(actor.organizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization", actor.organizationId()));

        User user = new User(org, email, fullName);
        user.changePassword(passwordEncoder.encode(password), java.time.Instant.now());
        user.setStatus(UserStatus.ACTIVE);
        user.assignRole(role);
        User saved = users.save(user);
        log.info("User created: id={} email={} role={} by={}", saved.getId(), saved.getEmail(), roleCode, actor.id());
        return saved;
    }

    /** Lists all users in the organization ordered by name. */
    @Transactional(readOnly = true)
    public java.util.List<User> list(CurrentUser actor) {
        return users.findAllByOrganizationIdOrderByFullNameAsc(actor.organizationId());
    }

    /** Updates an existing user's details and/or reassigns their role. */
    @Transactional
    public User update(UUID userId, String roleCode, String fullName, CurrentUser actor) {
        User user = loadManageable(userId, actor);

        if (RoleCodes.SUPER_ADMIN.equals(roleCode) && !actor.hasRole(RoleCodes.SUPER_ADMIN)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only a super admin can assign the SUPER_ADMIN role");
        }

        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName.trim());
        }

        if (roleCode != null && !roleCode.trim().isEmpty()) {
            Role role = roles.findByCode(roleCode.trim())
                    .orElseThrow(() -> new BusinessRuleException("Role not found: " + roleCode));
            user.reassignSingleRole(role);
        }

        User saved = users.save(user);
        log.info("User updated: id={} role={} by={}", saved.getId(), roleCode, actor.id());
        return saved;
    }

    /** Lets the user sign in again. */
    @Transactional
    public User activate(UUID userId, CurrentUser actor) {
        User user = loadManageable(userId, actor);
        if (user.getPasswordHash() == null) {
            throw new BusinessRuleException(
                    "This user has not set a password yet. They become active when they accept their invitation.");
        }
        user.setStatus(UserStatus.ACTIVE);
        log.info("User activated: userId={} by={}", userId, actor.id());
        return user;
    }

    /** Blocks sign-in and ends every session the user has. */
    @Transactional
    public User deactivate(UUID userId, CurrentUser actor) {
        if (userId.equals(actor.id())) {
            throw new BusinessRuleException("You cannot deactivate your own account");
        }
        User user = loadManageable(userId, actor);
        user.setStatus(UserStatus.SUSPENDED);
        sessionService.revokeAll(userId, SessionRevocationReason.ACCOUNT_DEACTIVATED, null);
        log.info("User deactivated: userId={} by={}", userId, actor.id());
        return user;
    }

    /**
     * Users of other organizations are reported as not found, so their existence is not revealed.
     * Only a super admin may switch another super admin on or off; otherwise anyone holding
     * {@code USER_UPDATE} could lock the owners out.
     */
    private User loadManageable(UUID userId, CurrentUser actor) {
        User user = users.findWithRolesById(userId)
                .filter(candidate -> candidate.getOrganization().getId().equals(actor.organizationId()))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (user.activeRoleCodes().contains(RoleCodes.SUPER_ADMIN) && !actor.hasRole(RoleCodes.SUPER_ADMIN)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only a super admin can manage a super admin");
        }
        return user;
    }
}
