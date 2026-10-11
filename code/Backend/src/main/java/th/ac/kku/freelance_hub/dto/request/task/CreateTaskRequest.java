package th.ac.kku.freelance_hub.dto.request.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskRequest {

    @NotBlank(message = "Enter a task name")
    @Size(
            max = 180,
            message = "Task name must be at most 180 characters"
    )
    private String name;

    private String description;

    @NotNull(message = "Enter task order")
    @PositiveOrZero(message = "Task order cannot be negative")
    private Integer sortOrder;
}