package th.ac.kku.freelance_hub.controller;

import java.io.IOException;
import java.util.List;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import th.ac.kku.freelance_hub.common.response.ApiResult;
import th.ac.kku.freelance_hub.common.response.PaginationMeta;
import th.ac.kku.freelance_hub.service.FinanceService;
import th.ac.kku.freelance_hub.service.FinanceTemplateService;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceTemplateController {
    private final FinanceTemplateService service;
    public record VersionReason(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
                                @jakarta.validation.constraints.NotBlank String reason) {}
    public record Asset(UUID id) {}
    @GetMapping("/settings") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Settings> settings() { return ApiResult.success("Finance settings",service.settings()); }
    @PutMapping("/settings") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Settings> settings(@jakarta.validation.Valid @RequestBody FinanceTemplateService.Settings request) {
        return ApiResult.success("Settings saved",service.saveSettings(request));
    }
    @PostMapping(value="/assets/logo",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @Tag(name="Finance Templates")
    public ApiResult<Asset> logo(@RequestPart("file") MultipartFile file) throws IOException {
        return ApiResult.success("Logo uploaded",new Asset(service.uploadLogo(file.getContentType(),file.getBytes())));
    }
    @GetMapping("/assets/{id}") @Tag(name="Finance Templates")
    public ResponseEntity<byte[]> asset(@PathVariable UUID id) {
        byte[] content=service.logo(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(service.logoType(id)))
                .header("Cache-Control","private, no-store").body(content);
    }
    @GetMapping("/presets") @Tag(name="Finance Templates")
    public ApiResult<List<FinanceTemplateService.Preset>> presets() { return ApiResult.success("Presets",service.presets()); }
    @PostMapping("/presets") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Preset> preset(@jakarta.validation.Valid @RequestBody FinanceTemplateService.Preset request) {
        return ApiResult.success("Preset created",service.savePreset(null,request));
    }
    @PutMapping("/presets/{id}") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Preset> preset(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody FinanceTemplateService.Preset request) {
        return ApiResult.success("Preset saved",service.savePreset(id,request));
    }
    @DeleteMapping("/presets/{id}") @Tag(name="Finance Templates")
    public ApiResult<Void> deletePreset(@PathVariable UUID id,@RequestParam long version) {
        service.deletePreset(id,version); return ApiResult.success("Preset deleted",null);
    }
    @GetMapping("/categories") @Tag(name="Finance Templates")
    public ApiResult<List<FinanceTemplateService.Category>> categories() { return ApiResult.success("Categories",service.categories()); }
    @PostMapping("/categories") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Category> category(@jakarta.validation.Valid @RequestBody FinanceTemplateService.Category request) {
        return ApiResult.success("Category created",service.saveCategory(null,request));
    }
    @PutMapping("/categories/{id}") @Tag(name="Finance Templates")
    public ApiResult<FinanceTemplateService.Category> category(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody FinanceTemplateService.Category request) {
        return ApiResult.success("Category saved",service.saveCategory(id,request));
    }
    @DeleteMapping("/categories/{id}") @Tag(name="Finance Templates")
    public ApiResult<Void> deleteCategory(@PathVariable UUID id,@RequestParam long version) {
        service.deleteCategory(id,version); return ApiResult.success("Category deleted",null);
    }
    @GetMapping("/documents") @Tag(name="Finance Documents")
    public ResponseEntity<ApiResult<List<FinanceTemplateService.Document>>> documents(@RequestParam(required=false) UUID invoiceId,
            @RequestParam(defaultValue="") String type,@RequestParam(defaultValue="") String status,
            @RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        FinanceService.Page<FinanceTemplateService.Document> result=service.documents(invoiceId,type,status,from,to,page,limit);
        return ResponseEntity.ok(ApiResult.success("Finance documents",result.items(),PaginationMeta.builder().page(page).limit(limit)
                .total(result.total()).totalPages((int)((result.total()+limit-1)/limit)).build()));
    }
    @GetMapping("/documents/receipt/{paymentId}") @Tag(name="Finance Documents")
    public ApiResult<FinanceTemplateService.Document> receipt(@PathVariable UUID paymentId) { return ApiResult.success("Receipt",service.receipt(paymentId)); }
    @GetMapping("/documents/{id}") @Tag(name="Finance Documents")
    public ApiResult<FinanceTemplateService.Document> document(@PathVariable UUID id) { return ApiResult.success("Document",service.document(id)); }
    @PostMapping("/tax-invoices") @Tag(name="Finance Documents")
    public ApiResult<FinanceTemplateService.Document> taxInvoice(@jakarta.validation.Valid @RequestBody FinanceTemplateService.TaxIssue request) {
        return ApiResult.success("Tax invoice issued",service.issueTax(request));
    }
    @PostMapping("/documents/{id}/cancel") @Tag(name="Finance Documents")
    public ApiResult<FinanceTemplateService.Document> cancelDocument(@PathVariable UUID id,@jakarta.validation.Valid @RequestBody VersionReason request) {
        return ApiResult.success("Document cancelled",service.cancelDocument(id,request.version(),request.reason()));
    }
}
