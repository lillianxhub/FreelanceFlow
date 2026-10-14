package th.ac.kku.freelance_hub.dto.request.project;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTaskReorderRequest {

    @NotNull(message = "Select a task to move")
    private UUID taskId;

    @NotNull(message = "Enter task order")
    @PositiveOrZero(message = "Task order cannot be negative")
    @Schema(description = "New position among active tasks, starting at 0", example = "0")
    private Integer sortOrder;
}
