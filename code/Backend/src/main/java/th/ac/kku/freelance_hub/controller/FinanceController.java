package th.ac.kku.freelance_hub.controller;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.common.response.PaginationMeta;
import th.ac.kku.freelance_hub.service.FinanceService;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
@Tag(name="Finance",description="Owner-scoped THB ledger. Active accounts have access unless Premium enforcement is enabled; amounts are decimal strings.")
public class FinanceController {
    private final FinanceService service;
    public record VersionReason(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
                                @jakarta.validation.constraints.NotBlank String reason) {}
    public record Version(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version) {}
    private <T> ResponseEntity<ApiResult<java.util.List<T>>> page(String title, FinanceService.Page<T> result) {
        return ResponseEntity.ok(ApiResult.success(title,result.items(),PaginationMeta.builder().page(result.page())
                .limit(result.limit()).total(result.total()).totalPages((int)((result.total()+result.limit()-1)/result.limit())).build()));
    }
    @GetMapping("/summary")
    @Operation(summary="Cash received, cash spent, outstanding invoices, VAT and withheld tax")
    public ApiResult<FinanceService.Summary> summary() { return ApiResult.success("Finance summary",service.summary()); }
    @GetMapping("/transactions")
    public ResponseEntity<ApiResult<java.util.List<FinanceService.Transaction>>> transactions(@RequestParam(defaultValue="") String kind,
            @RequestParam(defaultValue="") String search,@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        return page("Transactions",service.transactions(kind,search,from,to,page,limit));
    }
    @PostMapping("/transactions")
    public ResponseEntity<ApiResult<FinanceService.Transaction>> createTransaction(@jakarta.validation.Valid @RequestBody FinanceService.TransactionInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResult.success("Transaction created",service.saveTransaction(null,request)));
    }
    @PutMapping("/transactions/{id}")
    public ApiResult<FinanceService.Transaction> updateTransaction(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody FinanceService.TransactionInput request) {
        return ApiResult.success("Transaction updated",service.saveTransaction(id,request));
    }
    @PostMapping("/transactions/{id}/cancel")
    public ApiResult<FinanceService.Transaction> cancelTransaction(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody VersionReason request) {
        return ApiResult.success("Transaction cancelled",service.cancelTransaction(id,request.version(),request.reason()));
    }
    @GetMapping("/invoices")
    public ResponseEntity<ApiResult<java.util.List<FinanceService.Invoice>>> invoices(@RequestParam(defaultValue="") String status,
            @RequestParam(defaultValue="") String search,@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        return page("Invoices",service.invoices(status,search,from,to,page,limit));
    }
    @GetMapping("/invoices/{id}")
    public ApiResult<FinanceService.Invoice> invoice(@PathVariable UUID id) { return ApiResult.success("Invoice",service.invoice(id)); }
    @PostMapping("/invoices")
    public ResponseEntity<ApiResult<FinanceService.Invoice>> createInvoice(@jakarta.validation.Valid @RequestBody FinanceService.InvoiceInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResult.success("Invoice created",service.saveInvoice(null,request)));
    }
    @PutMapping("/invoices/{id}")
    public ApiResult<FinanceService.Invoice> updateInvoice(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody FinanceService.InvoiceInput request) {
        return ApiResult.success("Invoice updated",service.saveInvoice(id,request));
    }
    @PostMapping("/invoices/{id}/issue")
    @Tag(name="Finance Documents")
    public ApiResult<FinanceService.Invoice> issueInvoice(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody Version request) {
        return ApiResult.success("Invoice issued",service.issueInvoice(id,request.version()));
    }
    @PostMapping("/invoices/{id}/cancel")
    @Tag(name="Finance Documents")
    public ApiResult<FinanceService.Invoice> cancelInvoice(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody VersionReason request) {
        return ApiResult.success("Invoice cancelled",service.cancelInvoice(id,request.version(),request.reason()));
    }
    @GetMapping("/payments")
    public ResponseEntity<ApiResult<java.util.List<FinanceService.Payment>>> payments(@RequestParam(required=false) UUID invoiceId,
            @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String status,
            @RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        return page("Payments",service.payments(invoiceId,search,status,from,to,page,limit));
    }
    @PostMapping("/payments")
    @Operation(summary="Record a payment once using an idempotency key; receipt and income are atomic")
    public ResponseEntity<ApiResult<FinanceService.Payment>> payment(@jakarta.validation.Valid @RequestBody FinanceService.PaymentInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResult.success("Payment recorded",service.recordPayment(request)));
    }
    @PostMapping("/payments/{id}/cancel")
    public ApiResult<FinanceService.Payment> cancelPayment(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody VersionReason request) {
        return ApiResult.success("Payment cancelled",service.cancelPayment(id,request.version(),request.reason()));
    }
}
