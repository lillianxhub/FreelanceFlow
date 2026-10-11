package th.ac.kku.freelance_hub.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.domain.enums.TaskStatus;
import th.ac.kku.freelance_hub.dto.request.task.ChangeTaskStatusRequest;
import th.ac.kku.freelance_hub.dto.request.timeentry.StartTimerRequest;
import th.ac.kku.freelance_hub.dto.response.task.TaskResponse;
import th.ac.kku.freelance_hub.dto.response.timeentry.TimeEntryResponse;
import th.ac.kku.freelance_hub.service.CurrentUserProvider;
import th.ac.kku.freelance_hub.service.TaskService;
import th.ac.kku.freelance_hub.service.TimerService;

@RestController
@PreAuthorize("isAuthenticated()")
public class WorkspaceController {
    private final JdbcTemplate db;
    private final CurrentUserProvider currentUser;
    private final TaskService tasks;
    private final TimerService timer;

    public WorkspaceController(JdbcTemplate db, CurrentUserProvider currentUser, TaskService tasks, TimerService timer) {
        this.db = db;
        this.currentUser = currentUser;
        this.tasks = tasks;
        this.timer = timer;
    }

    public record Preferences(String boardTimerMode) {}
    public record MoveTask(TaskStatus status, long version, boolean stopCurrentTimer) {}
    public record BoardResult(TaskResponse task, TimeEntryResponse currentTimer) {}

    private String mode(UUID owner) {
        var values = db.query("SELECT board_timer_mode FROM workspace_preferences WHERE owner_id = ?",
                (rs, row) -> rs.getString(1), owner);
        return values.isEmpty() ? "AUTO" : values.get(0);
    }

    @GetMapping("/api/workspace/preferences")
    public ResponseEntity<ApiResult<Preferences>> preferences() {
        return ResponseEntity.ok(ApiResult.success("Workspace preferences", new Preferences(mode(currentUser.currentUserId()))));
    }

    @PatchMapping("/api/workspace/preferences")
    public ResponseEntity<ApiResult<Preferences>> savePreferences(@RequestBody Preferences request) {
        if (request == null || !("AUTO".equals(request.boardTimerMode()) || "MANUAL".equals(request.boardTimerMode()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid board timer mode");
        }
        UUID owner = currentUser.currentUserId();
        db.update("""
                INSERT INTO workspace_preferences(owner_id, board_timer_mode) VALUES (?, ?)
                ON CONFLICT(owner_id) DO UPDATE SET board_timer_mode = EXCLUDED.board_timer_mode
                """, owner, request.boardTimerMode());
        return ResponseEntity.ok(ApiResult.success("Workspace preferences saved", new Preferences(mode(owner))));
    }

    @PostMapping("/api/projects/{projectId}/tasks/{taskId}/workflow")
    @Transactional
    public ResponseEntity<ApiResult<BoardResult>> move(@PathVariable UUID projectId, @PathVariable UUID taskId,
            @RequestBody MoveTask request) {
        if (request == null || request.status() == null || request.version() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid task move");
        }
        UUID owner = currentUser.currentUserId();
        TaskResponse before = tasks.getById(owner, projectId, taskId);
        if (before.getVersion() == null || before.getVersion() != request.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task changed in another tab");
        }
        TimeEntryResponse running = timer.getCurrentTimer(owner).orElse(null);
        boolean sameTimer = running != null && taskId.equals(running.getTaskId());
        boolean auto = "AUTO".equals(mode(owner));
        if (running != null && !sameTimer && request.status() == TaskStatus.IN_PROGRESS && auto) {
            if (!request.stopCurrentTimer()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Another timer is running");
            }
            timer.stopTimer(owner);
            running = null;
        }
        if (sameTimer && request.status() != TaskStatus.IN_PROGRESS) {
            if (!auto) throw new ResponseStatusException(HttpStatus.CONFLICT, "Stop the timer first");
            timer.stopTimer(owner);
            running = null;
        }
        TaskResponse changed = before;
        if (before.getStatus() != request.status()) {
            if (auto && request.status() == TaskStatus.IN_PROGRESS) {
                if (before.getStatus() == TaskStatus.COMPLETED) {
                    changed = tasks.changeStatus(owner, taskId, ChangeTaskStatusRequest.builder()
                            .status(TaskStatus.IN_PROGRESS).build());
                }
                StartTimerRequest start = StartTimerRequest.builder().projectId(projectId).taskId(taskId).build();
                running = timer.startTimer(owner, start);
                changed = tasks.getById(owner, projectId, taskId);
            } else {
                changed = tasks.changeStatus(owner, taskId,
                        ChangeTaskStatusRequest.builder().status(request.status()).build());
            }
        }
        return ResponseEntity.ok(ApiResult.success("Task moved", new BoardResult(changed, running)));
    }
}
