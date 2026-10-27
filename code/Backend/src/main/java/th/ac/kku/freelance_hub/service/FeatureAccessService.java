package th.ac.kku.freelance_hub.service;

import java.util.UUID;
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
    public record Features(UserPlan plan, boolean finance, boolean premiumEnforced) {}

    @Transactional(readOnly = true)
    public Features features() { return features(currentUser.currentUserId()); }

    private Features features(UUID id) {
        if (id == null) throw new AuthenticationRequiredException();
        var account = repository.account(id);
        if (account == null || !account.active())
            throw new FinanceException(HttpStatus.FORBIDDEN, "FINANCE_ACCOUNT_INACTIVE", "An active account is required");
        var settings = repository.settings();
        boolean finance = !settings.premiumEnforced() || "ADMIN".equals(account.role()) || "PREMIUM".equals(account.plan());
        return new Features(UserPlan.valueOf(account.plan()), finance, settings.premiumEnforced());
    }

    @Transactional(readOnly = true)
    public UUID requireFinance() {
        UUID id = currentUser.currentUserId();
        if (!features(id).finance())
            throw new FinanceException(HttpStatus.FORBIDDEN, "FINANCE_PREMIUM_REQUIRED", "Finance requires Premium or Admin access");
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
