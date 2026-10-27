package th.ac.kku.freelance_hub.repository.finance;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class FinanceIdentityRepository {
    private final JdbcTemplate db;
    public Map<String, Object> seller(UUID owner) {
        db.update("""
                INSERT INTO finance_settings(owner_id,business_name,address)
                SELECT ?,coalesce(display_name,''),coalesce(address,'') FROM user_profiles WHERE user_id=?
                ON CONFLICT(owner_id) DO NOTHING""", owner, owner);
        db.update("INSERT INTO finance_settings(owner_id) VALUES(?) ON CONFLICT(owner_id) DO NOTHING", owner);
        return db.queryForMap("SELECT business_name,address,tax_id,branch,vat_registered,bank_details,footer,brand_color,logo_asset_id FROM finance_settings WHERE owner_id=?", owner);
    }
    public Map<String, Object> buyer(UUID owner, UUID client) {
        return db.queryForMap("SELECT name,company_name,address,tax_id FROM clients WHERE id=? AND owner_id=?", client, owner);
    }
}
