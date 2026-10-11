package th.ac.kku.freelance_hub.controller;

import java.sql.Date;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.service.CurrentUserProvider;

@RestController
@RequestMapping("/api/daily-plans")
@PreAuthorize("isAuthenticated()")
public class DailyPlanController {
    private final JdbcTemplate db;
    private final CurrentUserProvider currentUser;

    public DailyPlanController(JdbcTemplate db, CurrentUserProvider currentUser) {
        this.db = db;
        this.currentUser = currentUser;
    }

    public record PlanTask(UUID id, UUID projectId, String projectName, String name, String status,
            boolean available) {}
    public record DailyPlan(LocalDate date, long version, List<PlanTask> tasks) {}
    public record SavePlan(long version, List<UUID> taskIds) {}
    public record TaskPage(List<PlanTask> tasks, long total, int page, int limit) {}

    private void checkDate(LocalDate date) {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Bangkok"));
        if (date.isAfter(today.plusYears(1)) || date.isBefore(today.minusYears(2))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan date is outside supported range");
        }
    }

    private List<PlanTask> tasksFor(UUID owner, LocalDate date) {
        return db.query("""
                SELECT t.id, p.id project_id, p.name project_name, t.name, t.status,
                       (t.deleted_at IS NULL AND t.is_active = true AND p.deleted_at IS NULL
                         AND p.status = 'ACTIVE' AND t.status <> 'COMPLETED') available
                FROM daily_plan_items i JOIN tasks t ON t.id = i.task_id
                JOIN projects p ON p.id = t.project_id
                WHERE i.owner_id = ? AND i.plan_date = ? AND p.owner_id = ?
                ORDER BY i.position
                """, (rs, row) -> new PlanTask(
                        rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                        rs.getString("project_name"), rs.getString("name"), rs.getString("status"),
                        rs.getBoolean("available")), owner, Date.valueOf(date), owner);
    }

    private DailyPlan read(UUID owner, LocalDate date) {
        List<Long> versions = db.query("SELECT version FROM daily_plans WHERE owner_id = ? AND plan_date = ?",
                (rs, row) -> rs.getLong(1), owner, Date.valueOf(date));
        return new DailyPlan(date, versions.isEmpty() ? 0 : versions.get(0), tasksFor(owner, date));
    }

    @GetMapping("/{date}")
    public ResponseEntity<ApiResult<DailyPlan>> get(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        checkDate(date);
        return ResponseEntity.ok(ApiResult.success("Daily plan", read(currentUser.currentUserId(), date)));
    }

    @PutMapping("/{date}")
    @Transactional
    public ResponseEntity<ApiResult<DailyPlan>> save(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody SavePlan request) {
        checkDate(date);
        if (request == null || request.taskIds() == null || request.version() < 0
                || request.taskIds().size() > 50 || new HashSet<>(request.taskIds()).size() != request.taskIds().size()
                || request.taskIds().contains(null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid task list");
        }
        UUID owner = currentUser.currentUserId();
        db.update("INSERT INTO daily_plans(owner_id, plan_date) VALUES (?, ?) ON CONFLICT DO NOTHING",
                owner, Date.valueOf(date));
        int updated = db.update("UPDATE daily_plans SET version = version + 1 WHERE owner_id = ? AND plan_date = ? AND version = ?",
                owner, Date.valueOf(date), request.version());
        if (updated == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Plan changed in another tab");
        Set<UUID> existing = new HashSet<>(db.query("SELECT task_id FROM daily_plan_items WHERE owner_id = ? AND plan_date = ?",
                (rs, row) -> rs.getObject(1, UUID.class), owner, Date.valueOf(date)));
        for (UUID task : request.taskIds()) {
            if (existing.contains(task)) continue;
            Integer allowed = db.queryForObject("""
                    SELECT COUNT(*) FROM tasks t JOIN projects p ON p.id = t.project_id
                    WHERE t.id = ? AND p.owner_id = ? AND t.is_active = true AND t.deleted_at IS NULL
                      AND p.deleted_at IS NULL AND p.status = 'ACTIVE' AND t.status <> 'COMPLETED'
                    """, Integer.class, task, owner);
            if (allowed == null || allowed != 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task cannot be added");
        }
        db.update("DELETE FROM daily_plan_items WHERE owner_id = ? AND plan_date = ?", owner, Date.valueOf(date));
        for (int index = 0; index < request.taskIds().size(); index++) {
            db.update("INSERT INTO daily_plan_items(owner_id, plan_date, task_id, position) VALUES (?, ?, ?, ?)",
                    owner, Date.valueOf(date), request.taskIds().get(index), index);
        }
        return ResponseEntity.ok(ApiResult.success("Daily plan saved", read(owner, date)));
    }

    @GetMapping("/previous")
    public ResponseEntity<ApiResult<DailyPlan>> previous(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate before) {
        checkDate(before);
        UUID owner = currentUser.currentUserId();
        List<LocalDate> dates = db.query("""
                SELECT DISTINCT i.plan_date FROM daily_plan_items i JOIN tasks t ON t.id = i.task_id
                JOIN projects p ON p.id = t.project_id
                WHERE i.owner_id = ? AND i.plan_date < ? AND t.status <> 'COMPLETED'
                  AND t.is_active = true AND t.deleted_at IS NULL AND p.deleted_at IS NULL
                  AND p.status = 'ACTIVE' AND p.owner_id = ? ORDER BY i.plan_date DESC LIMIT 1
                """, (rs, row) -> rs.getDate(1).toLocalDate(), owner, Date.valueOf(before), owner);
        return ResponseEntity.ok(ApiResult.success("Previous unfinished plan", dates.isEmpty()
                ? new DailyPlan(before, 0, List.of()) : read(owner, dates.get(0))));
    }

    @GetMapping("/tasks")
    public ResponseEntity<ApiResult<TaskPage>> search(@RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
        if (page < 1 || limit < 1 || limit > 50) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page");
        UUID owner = currentUser.currentUserId();
        String pattern = "%" + search.strip().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
        String where = " FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.owner_id = ? "
                + "AND p.status = 'ACTIVE' AND p.deleted_at IS NULL AND t.is_active = true "
                + "AND t.deleted_at IS NULL AND t.status <> 'COMPLETED' "
                + "AND LOWER(t.name) LIKE ? ESCAPE '\\' AND (?::uuid IS NULL OR p.id = ?::uuid)";
        long total = db.queryForObject("SELECT COUNT(*)" + where, Long.class, owner, pattern, projectId, projectId);
        List<PlanTask> tasks = db.query("SELECT t.id, p.id project_id, p.name project_name, t.name, t.status" + where
                + " ORDER BY p.name, t.sort_order, t.id LIMIT ? OFFSET ?",
                (rs, row) -> new PlanTask(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                        rs.getString("project_name"), rs.getString("name"), rs.getString("status"), true),
                owner, pattern, projectId, projectId, limit, (page - 1) * limit);
        return ResponseEntity.ok(ApiResult.success("Available tasks", new TaskPage(tasks, total, page, limit)));
    }
}
