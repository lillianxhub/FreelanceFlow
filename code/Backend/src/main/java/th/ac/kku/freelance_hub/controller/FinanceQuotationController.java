package th.ac.kku.freelance_hub.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.common.response.PaginationMeta;
import th.ac.kku.freelance_hub.service.FinanceQuotationService;
import th.ac.kku.freelance_hub.service.FinanceService;

@RestController
@RequestMapping("/api/finance/quotations")
@RequiredArgsConstructor
@Tag(name="Finance Quotations",description="Owner-scoped quotations; conversion creates a single editable invoice draft")
public class FinanceQuotationController {
    private final FinanceQuotationService service;
    public record CreateInvoice(@NotNull @PositiveOrZero Long version, @NotNull LocalDate issueDate, @NotNull LocalDate dueDate) {}

    @GetMapping
    public ApiResult<List<FinanceQuotationService.Quotation>> list(@RequestParam(defaultValue="") String status,
            @RequestParam(defaultValue="") String search,@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        var result=service.list(status,search,from,to,page,limit);
        return ApiResult.success("Quotations",result.items(),PaginationMeta.builder().page(page).limit(limit).total(result.total())
                .totalPages((int)((result.total()+limit-1)/limit)).build());
    }
    @GetMapping("/{id}")
    public ApiResult<FinanceQuotationService.Quotation> get(@PathVariable UUID id) { return ApiResult.success("Quotation",service.get(id)); }
    @PostMapping
    public ResponseEntity<ApiResult<FinanceQuotationService.Quotation>> create(@Valid @RequestBody FinanceQuotationService.QuotationInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResult.success("Quotation created",service.save(null,input)));
    }
    @PutMapping("/{id}")
    public ApiResult<FinanceQuotationService.Quotation> update(@PathVariable UUID id,@Valid @RequestBody FinanceQuotationService.QuotationInput input) {
        return ApiResult.success("Quotation updated",service.save(id,input));
    }
    @PostMapping("/{id}/issue")
    public ApiResult<FinanceQuotationService.Quotation> issue(@PathVariable UUID id,@Valid @RequestBody FinanceController.Version input) {
        return ApiResult.success("Quotation issued",service.issue(id,input.version()));
    }
    @PostMapping("/{id}/cancel")
    public ApiResult<FinanceQuotationService.Quotation> cancel(@PathVariable UUID id,@Valid @RequestBody FinanceController.VersionReason input) {
        return ApiResult.success("Quotation cancelled",service.cancel(id,input.version(),input.reason()));
    }
    @PostMapping("/{id}/invoice")
    public ApiResult<FinanceService.Invoice> invoice(@PathVariable UUID id,@Valid @RequestBody CreateInvoice input) {
        return ApiResult.success("Invoice draft",service.invoice(id,input.version(),input.issueDate(),input.dueDate()));
    }
}
