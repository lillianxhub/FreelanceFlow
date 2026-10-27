package th.ac.kku.freelance_hub.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.common.response.PaginationMeta;
import th.ac.kku.freelance_hub.domain.enums.UserPlan;
import th.ac.kku.freelance_hub.service.AdminService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Account statistics and plan changes; ADMIN role required")
public class AdminController {
    private final AdminService service;
    private final th.ac.kku.freelance_hub.service.FeatureAccessService features;

    public record ChangePlanRequest(@NotNull UserPlan plan, @NotNull @PositiveOrZero Long version) {}
    public record ChangeFeaturesRequest(@NotNull Boolean premiumEnforced, @NotNull @PositiveOrZero Long version) {}

    @GetMapping("/features")
    public ApiResult<th.ac.kku.freelance_hub.repository.FeatureSettingsRepository.FeatureSettings> features() {
        return ApiResult.success("Feature settings", features.settings());
    }

    @PatchMapping("/features")
    public ApiResult<th.ac.kku.freelance_hub.repository.FeatureSettingsRepository.FeatureSettings> features(
            @Valid @RequestBody ChangeFeaturesRequest request) {
        return ApiResult.success("Feature settings updated", features.update(request.premiumEnforced(), request.version()));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResult<AdminService.Summary>> summary() {
        return ResponseEntity.ok(ApiResult.success("Admin summary", service.summary()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResult<java.util.List<AdminService.Account>>> users(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String plan,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        AdminService.Accounts result = service.users(search, plan, status, page, limit);
        return ResponseEntity.ok(ApiResult.success("Accounts", result.items(), PaginationMeta.builder()
                .page(page).limit(limit).total(result.total())
                .totalPages((int) ((result.total() + limit - 1) / limit)).build()));
    }

    @PatchMapping("/users/{id}/plan")
    public ResponseEntity<ApiResult<AdminService.Account>> changePlan(@PathVariable UUID id,
            @Valid @RequestBody ChangePlanRequest request) {
        return ResponseEntity.ok(ApiResult.success("Plan updated",
                service.changePlan(id, request.plan(), request.version())));
    }
}
