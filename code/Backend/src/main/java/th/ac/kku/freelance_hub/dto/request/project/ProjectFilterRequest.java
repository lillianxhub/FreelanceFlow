package th.ac.kku.freelance_hub.dto.request.project;

import org.springframework.data.domain.Sort;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectFilterRequest {

    @Size(max = 180, message = "Search must be at most 180 characters")
    private String search;

    @Pattern(regexp = "ALL|PLANNED|ACTIVE|ON_HOLD|COMPLETED|ARCHIVED",
            message = "Invalid status")
    private String status;

    @Pattern(regexp = "tasks", message = "Only tasks include is supported")
    private String include;

    @Builder.Default
    @Min(value = 1, message = "Page must start at 1")
    private int page = 1;

    @Builder.Default
    @Min(value = 1, message = "Page size must be at least 1")
    @Max(value = 100, message = "Page size must be at most 100")
    private int limit = 20;

    @Builder.Default
    @NotBlank(message = "Sort field is required")
    @Pattern(
            regexp = "update_at|end_date|project_name",
            message = "Sort by update_at, end_date, or project_name"
    )
    private String sortBy = "project_name";

    @Builder.Default
    @NotNull(message = "Sort direction is required")
    private Sort.Direction direction = Sort.Direction.ASC;
}
