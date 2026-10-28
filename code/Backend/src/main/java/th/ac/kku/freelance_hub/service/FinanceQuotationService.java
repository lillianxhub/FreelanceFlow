package th.ac.kku.freelance_hub.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.kku.freelance_hub.exception.FinanceException;
import th.ac.kku.freelance_hub.repository.finance.FinanceQuotationRepository;
import th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers;

@Service
@RequiredArgsConstructor
public class FinanceQuotationService {
    private final FinanceQuotationRepository repository;
    private final FeatureAccessService access;
    private final FinanceDocumentIdentity identities;
    private final FinanceDocumentNumbers numbers;
    private final FinanceService finance;

    @io.swagger.v3.oas.annotations.media.Schema(name="QuotationInput")
    public record QuotationInput(UUID clientId, UUID projectId, LocalDate issueDate, LocalDate validUntil, String vatRate,
                        String discount, String note, List<FinancePolicy.Line> lines, Long version) {}
    public record Quotation(UUID id, String number, UUID clientId, UUID projectId, LocalDate issueDate, LocalDate validUntil,
                            String status, String subtotal, String discount, String vatRate, String vat, String total,
                            long version, List<FinancePolicy.LineResponse> lines, String sellerSnapshot, String buyerSnapshot,
                            String brandSnapshot, String note, UUID invoiceId) {}
    private void require(boolean valid, String message) {
        if (!valid) throw new FinanceException(HttpStatus.BAD_REQUEST,"FINANCE_VALIDATION",message);
    }
    private void conflict(boolean valid) {
        if (!valid) throw new FinanceException(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Quotation changed; reload and retry");
    }
    private Quotation find(UUID id, UUID owner) {
        var item = repository.find(id,owner);
        if (item == null) throw new FinanceException(HttpStatus.NOT_FOUND,"FINANCE_NOT_FOUND","Quotation not found");
        return item;
    }
    private Quotation locked(UUID id, UUID owner) {
        if (!repository.lock(id,owner)) throw new FinanceException(HttpStatus.NOT_FOUND,"FINANCE_NOT_FOUND","Quotation not found");
        return find(id,owner);
    }
    @Transactional(readOnly=true)
    public FinanceService.Page<Quotation> list(String status, String search, LocalDate from, LocalDate to, int page, int limit) {
        UUID owner=access.requireFinance();
        require(page>0 && page<=1_000_000 && limit>0 && limit<=100,"Invalid pagination");
        require(status==null || status.isBlank() || List.of("DRAFT","ISSUED","CANCELLED").contains(status),"Invalid status");
        require(search==null || search.length()<=100,"Search is too long");
        require(from==null || to==null || !to.isBefore(from),"End date precedes start date");
        return repository.list(owner,status==null?"":status,search==null?"":search.trim(),from,to,page,limit);
    }
    @Transactional(readOnly=true)
    public Quotation get(UUID id) { return find(id,access.requireFinance()); }

    @Transactional
    public Quotation save(UUID id, QuotationInput input) {
        UUID owner=id==null?access.requireFinanceCreation():access.requireFinance();
        require(input!=null && input.clientId()!=null && input.issueDate()!=null && input.validUntil()!=null,"Client and dates are required");
        require(!input.validUntil().isBefore(input.issueDate()),"Valid-until date precedes issue date");
        if (!repository.clientOwned(owner,input.clientId()) || !repository.projectMatches(owner,input.clientId(),input.projectId()))
            throw new FinanceException(HttpStatus.NOT_FOUND,"FINANCE_NOT_FOUND","Client or project not found");
        var totals=FinancePolicy.calculate(input.lines(),input.discount(),input.vatRate());
        require(totals.total().signum()>0,"Quotation total must be positive");
        UUID target=id==null?UUID.randomUUID():id;
        if(id==null) repository.insert(target,owner,input,totals);
        else {
            var current=locked(id,owner);
            require(input.version()!=null && input.version()>=0,"Version is required");
            conflict(current.version()==input.version() && current.status().equals("DRAFT"));
            conflict(repository.update(id,owner,input,totals));
        }
        return find(target,owner);
    }
    @Transactional
    public Quotation issue(UUID id,long version) {
        UUID owner=access.requireFinance(); var draft=locked(id,owner);
        conflict(draft.version()==version);
        require(draft.status().equals("DRAFT"),"Only draft quotations can be issued");
        var snapshot=identities.snapshot(owner,draft.clientId(),draft.vatRate());
        String number=numbers.next(owner,"QT",draft.issueDate());
        conflict(repository.issue(id,owner,version,number,snapshot));
        return find(id,owner);
    }
    @Transactional
    public Quotation cancel(UUID id,long version,String reason) {
        UUID owner=access.requireFinance(); var current=locked(id,owner);
        require(reason!=null && !reason.isBlank(),"Cancellation reason is required");
        conflict(current.version()==version && !current.status().equals("CANCELLED"));
        conflict(repository.cancel(id,owner,version,reason.trim()));
        return find(id,owner);
    }
    @Transactional
    public FinanceService.Invoice invoice(UUID id,long version,LocalDate issueDate,LocalDate dueDate) {
        UUID owner=access.requireFinanceCreation(); var quotation=locked(id,owner);
        require(quotation.status().equals("ISSUED"),"Only issued, non-cancelled quotations can create invoices");
        // A retry opens the same invoice, including when another concurrent request created it.
        if(quotation.invoiceId()!=null) return finance.invoice(quotation.invoiceId());
        conflict(quotation.version()==version);
        var input=new FinanceService.InvoiceInput(quotation.clientId(),quotation.projectId(),issueDate,dueDate,quotation.vatRate(),
                quotation.discount(),quotation.note(),quotation.lines().stream().map(line ->
                        new FinancePolicy.Line(line.description(),line.quantity(),line.unit(),line.unitPrice())).toList(),null);
        var invoice=finance.saveInvoice(null,input);
        repository.linkInvoice(invoice.id(),id,owner);
        return finance.invoice(invoice.id());
    }
}
