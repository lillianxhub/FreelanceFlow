package th.ac.kku.freelance_hub.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import th.ac.kku.freelance_hub.domain.enums.UserPlan;
import th.ac.kku.freelance_hub.exception.InvalidArgumentException;
import th.ac.kku.freelance_hub.exception.InvalidStateException;

@Service
@RequiredArgsConstructor
public class AdminService {
    private static final ZoneId BANGKOK = ZoneId.of("Asia/Bangkok");
    private final JdbcTemplate db;

    public record MonthCount(String month, long count) {}
    public record Summary(long total, long activeFree, long activePremium, long newThisMonth,
                          List<MonthCount> signups) {}
    public record Account(UUID id, String displayName, String email, Instant createdAt,
                          boolean active, String role, String plan, long version) {}
    public record Accounts(List<Account> items, long total, int page, int limit) {}

    @Transactional(readOnly = true)
    public Summary summary() {
        Map<String, Object> totals = db.queryForMap("""
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE is_active = TRUE AND plan = 'FREE') AS active_free,
                       COUNT(*) FILTER (WHERE is_active = TRUE AND plan = 'PREMIUM') AS active_premium
                FROM users WHERE deleted_at IS NULL
                """);
        YearMonth now = YearMonth.now(BANGKOK);
        List<MonthCount> months = new ArrayList<>();
        for (int offset = 5; offset >= 0; offset--) {
            YearMonth month = now.minusMonths(offset);
            Instant start = month.atDay(1).atStartOfDay(BANGKOK).toInstant();
            Instant end = month.plusMonths(1).atDay(1).atStartOfDay(BANGKOK).toInstant();
            Long count = db.queryForObject("""
                    SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
                    """, Long.class, Timestamp.from(start), Timestamp.from(end));
            months.add(new MonthCount(month.toString(), count == null ? 0 : count));
        }
        return new Summary(number(totals.get("total")), number(totals.get("active_free")),
                number(totals.get("active_premium")), months.get(5).count(), months);
    }

    @Transactional(readOnly = true)
    public Accounts users(String search, String plan, String status, int page, int limit) {
        if (page < 1 || page > 1_000_000 || limit < 1 || limit > 100)
            throw new InvalidArgumentException("Invalid pagination");
        if (plan != null && !plan.isBlank() && !plan.equals("FREE") && !plan.equals("PREMIUM"))
            throw new InvalidArgumentException("Invalid plan filter");
        if (status != null && !status.isBlank() && !status.equals("ACTIVE") && !status.equals("INACTIVE"))
            throw new InvalidArgumentException("Invalid status filter");
        StringBuilder where = new StringBuilder(" WHERE u.deleted_at IS NULL");
        List<Object> args = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            if (search.length() > 100) throw new InvalidArgumentException("Search is too long");
            where.append(" AND (LOWER(u.email) LIKE ? ESCAPE '!' OR LOWER(COALESCE(p.display_name,'')) LIKE ? ESCAPE '!')");
            String term = "%" + search.trim().toLowerCase(java.util.Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            args.add(term);
            args.add(term);
        }
        if (plan != null && !plan.isBlank()) { where.append(" AND u.plan = ?"); args.add(plan); }
        if (status != null && !status.isBlank()) {
            where.append(" AND u.is_active = ?"); args.add(status.equals("ACTIVE"));
        }
        String from = " FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id" + where;
        Long total = db.queryForObject("SELECT COUNT(*)" + from, Long.class, args.toArray());
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(limit);
        pageArgs.add((page - 1) * limit);
        List<Account> items = db.query("""
                SELECT u.id, p.display_name, u.email, u.created_at, u.is_active, u.role, u.plan, u.version
                """ + from + " ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?",
                (rs, row) -> new Account((UUID) rs.getObject("id"), rs.getString("display_name"),
                        rs.getString("email"), rs.getTimestamp("created_at").toInstant(),
                        rs.getBoolean("is_active"), rs.getString("role"), rs.getString("plan"),
                        rs.getLong("version")), pageArgs.toArray());
        return new Accounts(items, total == null ? 0 : total, page, limit);
    }

    @Transactional
    public Account changePlan(UUID id, UserPlan plan, long version) {
        if (plan == null || version < 0) throw new InvalidArgumentException("Plan and version are required");
        int updated = db.update("""
                UPDATE users SET plan = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND version = ? AND deleted_at IS NULL
                """, plan.name(), id, version);
        if (updated == 0) throw new InvalidStateException("Account changed or no longer exists; reload and retry");
        return db.queryForObject("""
                SELECT u.id, p.display_name, u.email, u.created_at, u.is_active, u.role, u.plan, u.version
                FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?
                """, (rs, row) -> new Account((UUID) rs.getObject("id"), rs.getString("display_name"),
                        rs.getString("email"), rs.getTimestamp("created_at").toInstant(),
                        rs.getBoolean("is_active"), rs.getString("role"), rs.getString("plan"),
                        rs.getLong("version")), id);
    }

    private long number(Object value) { return ((Number) value).longValue(); }
}
