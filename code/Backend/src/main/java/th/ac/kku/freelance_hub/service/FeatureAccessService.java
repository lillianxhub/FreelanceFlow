package th.ac.kku.freelance_hub.service;

import java.util.UUID;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.kku.freelance_hub.domain.enums.UserPlan;
import th.ac.kku.freelance_hub.exception.AuthenticationRequiredException;
import th.ac.kku.freelance_hub.exception.FinanceException;
import th.ac.kku.freelance_hub.exception.InvalidStateException;
import th.ac.kku.freelance_hub.repository.FeatureSettingsRepository;

/** Reads the persisted policy on each request so changes apply across application instances. */
@Service
@RequiredArgsConstructor
public class FeatureAccessService {
    private final FeatureSettingsRepository repository;
    private final CurrentUserProvider currentUser;
    public record Features(UserPlan plan, boolean finance, boolean premiumEnforced, boolean trialActive,
                           Instant trialEndsAt, boolean trialAvailable) {}

    @Transactional(readOnly = true)
    public Features features() { return features(currentUser.currentUserId()); }

    private Features features(UUID id) {
        if (id == null) throw new AuthenticationRequiredException();
        var account = repository.account(id);
        if (account == null || !account.active())
            throw new FinanceException(HttpStatus.FORBIDDEN, "FINANCE_ACCOUNT_INACTIVE", "An active account is required");
        var settings = repository.settings();
        boolean trialActive = account.trialEndsAt() != null && Instant.now().isBefore(account.trialEndsAt());
        boolean trialAvailable = "FREE".equals(account.plan()) && "USER".equals(account.role())
                && account.trialEndsAt() == null;
        boolean finance = !settings.premiumEnforced() || "ADMIN".equals(account.role()) || "PREMIUM".equals(account.plan()) || trialActive;
        return new Features(UserPlan.valueOf(account.plan()), finance, settings.premiumEnforced(), trialActive, account.trialEndsAt(), trialAvailable);
    }

    @Transactional
    public Features startTrial() {
        UUID id = currentUser.currentUserId();
        features(id); // Validate the authenticated account before writing.
        if (!repository.startTrial(id, Instant.now().plus(7, ChronoUnit.DAYS)))
            throw new InvalidStateException("A Premium trial is available once per Free account");
        return features(id);
    }

    @Transactional(readOnly = true)
    public UUID requireFinance() {
        UUID id = currentUser.currentUserId();
        features(id);
        return id;
    }

    @Transactional(readOnly = true)
    public UUID requireFinanceCreation() {
        UUID id = currentUser.currentUserId();
        if (!features(id).finance())
            throw new FinanceException(HttpStatus.FORBIDDEN, "FINANCE_PREMIUM_REQUIRED", "Creating Finance records requires Premium or Admin access");
        return id;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public FeatureSettingsRepository.FeatureSettings settings() { return repository.settings(); }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public FeatureSettingsRepository.FeatureSettings update(boolean enforced, long version) {
        if (!repository.update(enforced, version))
            throw new InvalidStateException("Feature settings changed; reload and retry");
        return repository.settings();
    }
}
