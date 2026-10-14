package th.ac.kku.freelance_hub.repository;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class FeatureSettingsRepository {
    private final JdbcTemplate db;
    @io.swagger.v3.oas.annotations.media.Schema(name="FeatureSettings")
    public record FeatureSettings(boolean premiumEnforced, long version) {}
    public record Account(String role, String plan, boolean active) {}

    public FeatureSettings settings() {
        return db.queryForObject("SELECT premium_enforced,version FROM app_feature_settings WHERE id=1",
                (rs, n) -> new FeatureSettings(rs.getBoolean(1), rs.getLong(2)));
    }
    public boolean update(boolean enforced, long version) {
        return db.update("UPDATE app_feature_settings SET premium_enforced=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?",
                enforced, version) == 1;
    }
    public Account account(UUID id) {
        var accounts = db.query("SELECT role,plan,is_active,deleted_at FROM users WHERE id=?",
                (rs, n) -> new Account(rs.getString(1), rs.getString(2),
                        rs.getBoolean(3) && rs.getTimestamp(4) == null), id);
        return accounts.isEmpty() ? null : accounts.get(0);
    }
}
