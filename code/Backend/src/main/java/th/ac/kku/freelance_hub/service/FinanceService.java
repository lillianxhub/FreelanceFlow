package th.ac.kku.freelance_hub.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import th.ac.kku.freelance_hub.exception.FinanceException;

@Service
@RequiredArgsConstructor
public class FinanceService {
    private final JdbcTemplate db;
    private final th.ac.kku.freelance_hub.repository.finance.FinanceInvoiceQuery invoicesQuery;
    private final th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers;
    private final FeatureAccessService access;
    private final FinanceDocumentIdentity identities;

    public record Page<T>(List<T> items, long total, int page, int limit) {}
    public record TransactionInput(String kind, LocalDate date, String description, String category,
                                   UUID projectId, String amount, Long version, String reason) {}
    public record Transaction(UUID id, String kind, LocalDate date, String description, String category,
                              UUID projectId, String amount, UUID paymentId, boolean cancelled, long version) {}
    public record InvoiceInput(UUID clientId, UUID projectId, LocalDate issueDate, LocalDate dueDate,
                               String vatRate, String discount, String note, List<FinancePolicy.Line> lines, Long version) {}
    public record Invoice(UUID id, String number, UUID clientId, UUID projectId, LocalDate issueDate,
                          LocalDate dueDate, String status, String subtotal, String discount, String vatRate,
                          String vat, String total, String paid, long version, List<FinancePolicy.LineResponse> lines,
                          String sellerSnapshot, String buyerSnapshot, String brandSnapshot, String note, String taxIssuedBase,
                          UUID sourceQuotationId) {}
    public record PaymentInput(UUID invoiceId, LocalDate date, String received, String withheld,
                               String method, String reference, String withholdingCertificate, String idempotencyKey) {}
    public record Payment(UUID id, UUID invoiceId, LocalDate date, String received, String withheld,
                          String method, String reference, String withholdingCertificate, boolean cancelled, long version) {}
    public record MonthAmount(String month,String income,String expenses) {}
    public record Summary(String income, String expenses, String net, String outstanding, String vat, String withheld,
                          List<MonthAmount> cashByMonth) {}

    public UUID owner() {
        return access.requireFinance();
    }

    public UUID creationOwner() { return access.requireFinanceCreation(); }

    private FinanceException fail(HttpStatus status, String code, String message) {
        return new FinanceException(status, code, message);
    }
    private void require(boolean valid, String message) {
        if (!valid) throw fail(HttpStatus.BAD_REQUEST, "FINANCE_VALIDATION", message);
    }
    private void found(boolean valid) {
        if (!valid) throw fail(HttpStatus.NOT_FOUND, "FINANCE_NOT_FOUND", "Finance item not found");
    }
    private void conflict(String message) {
        throw fail(HttpStatus.CONFLICT, "FINANCE_CONFLICT", message);
    }
    private void project(UUID owner, UUID projectId, UUID clientId) {
        if (projectId == null) return;
        Long count = db.queryForObject("SELECT count(*) FROM projects WHERE id=? AND owner_id=? AND (?::uuid IS NULL OR client_id=?)",
                Long.class, projectId, owner, clientId, clientId);
        found(count != null && count == 1);
    }
    private int page(int page, int limit) {
        require(page > 0 && page <= 1_000_000 && limit > 0 && limit <= 100, "Invalid pagination");
        return (page - 1) * limit;
    }
    private String amount(BigDecimal value) { return value.setScale(2).toPlainString(); }

    @Transactional(readOnly = true)
    public Summary summary() {
        UUID owner = owner();
        BigDecimal income = db.queryForObject("SELECT coalesce(sum(amount),0) FROM finance_transactions WHERE owner_id=? AND kind='INCOME' AND cancelled_at IS NULL", BigDecimal.class, owner);
        BigDecimal expenses = db.queryForObject("SELECT coalesce(sum(amount),0) FROM finance_transactions WHERE owner_id=? AND kind='EXPENSE' AND cancelled_at IS NULL", BigDecimal.class, owner);
        BigDecimal outstanding = db.queryForObject("""
                SELECT coalesce(sum(i.total - coalesce(p.paid,0)),0) FROM finance_invoices i
                LEFT JOIN (SELECT invoice_id,sum(received+withheld) paid FROM finance_payments WHERE owner_id=? AND cancelled_at IS NULL GROUP BY invoice_id) p ON p.invoice_id=i.id
                WHERE i.owner_id=? AND i.status='ISSUED'""", BigDecimal.class, owner, owner);
        BigDecimal vat = db.queryForObject("SELECT coalesce(sum(vat),0) FROM finance_invoices WHERE owner_id=? AND status='ISSUED'", BigDecimal.class, owner);
        BigDecimal withheld = db.queryForObject("SELECT coalesce(sum(withheld),0) FROM finance_payments WHERE owner_id=? AND cancelled_at IS NULL", BigDecimal.class, owner);
        YearMonth current=YearMonth.now(ZoneId.of("Asia/Bangkok"));
        List<MonthAmount> months=new java.util.ArrayList<>();
        for(int offset=5;offset>=0;offset--) {
            YearMonth month=current.minusMonths(offset);
            Map<String,Object> sums=db.queryForMap("""
                    SELECT coalesce(sum(amount) FILTER(WHERE kind='INCOME'),0) income,
                           coalesce(sum(amount) FILTER(WHERE kind='EXPENSE'),0) expenses
                    FROM finance_transactions WHERE owner_id=? AND cancelled_at IS NULL
                    AND occurred_on>=? AND occurred_on<?""",owner,month.atDay(1),month.plusMonths(1).atDay(1));
            months.add(new MonthAmount(month.toString(),amount((BigDecimal)sums.get("income")),amount((BigDecimal)sums.get("expenses"))));
        }
        return new Summary(amount(income), amount(expenses), amount(income.subtract(expenses)), amount(outstanding), amount(vat), amount(withheld),months);
    }

    @Transactional(readOnly = true)
    public Page<Transaction> transactions(String kind, String search, LocalDate from, LocalDate to, int page, int limit) {
        UUID owner = owner(); int offset = page(page, limit);
        require(kind == null || kind.isBlank() || kind.equals("INCOME") || kind.equals("EXPENSE"), "Invalid kind");
        String term = "%" + (search == null ? "" : search.trim().toLowerCase()).replace("%", "\\%") + "%";
        require(term.length() <= 102, "Search is too long");
        String where = " FROM finance_transactions WHERE owner_id=? AND (?='' OR kind=?) AND lower(description) LIKE ? AND (?::date IS NULL OR occurred_on>=?) AND (?::date IS NULL OR occurred_on<=?)";
        Object[] args = {owner, kind == null ? "" : kind, kind == null ? "" : kind, term, from, from, to, to};
        Long total = db.queryForObject("SELECT count(*)" + where, Long.class, args);
        List<Transaction> items = db.query("SELECT *" + where + " ORDER BY occurred_on DESC, created_at DESC LIMIT ? OFFSET ?",
                (rs,n) -> new Transaction((UUID) rs.getObject("id"), rs.getString("kind"), rs.getDate("occurred_on").toLocalDate(),
                        rs.getString("description"), rs.getString("category"), (UUID) rs.getObject("project_id"),
                        amount(rs.getBigDecimal("amount")), (UUID) rs.getObject("payment_id"), rs.getTimestamp("cancelled_at") != null,
                        rs.getLong("version")), append(args, limit, offset));
        return new Page<>(items, total, page, limit);
    }
    private Object[] append(Object[] values, Object... extra) {
        Object[] combined = java.util.Arrays.copyOf(values, values.length + extra.length);
        System.arraycopy(extra, 0, combined, values.length, extra.length); return combined;
    }

    @Transactional
    public Transaction saveTransaction(UUID id, TransactionInput input) {
        UUID owner = id == null ? creationOwner() : owner(); require(input != null, "Transaction is required");
        require("INCOME".equals(input.kind()) || "EXPENSE".equals(input.kind()), "Invalid transaction kind");
        require(input.date() != null && input.description() != null && !input.description().isBlank(), "Date and description are required");
        project(owner, input.projectId(), null);
        BigDecimal value = FinancePolicy.money(input.amount(), true);
        UUID target = id == null ? UUID.randomUUID() : id;
        if (id == null) db.update("""
                INSERT INTO finance_transactions(id,owner_id,kind,occurred_on,description,category,project_id,amount)
                VALUES(?,?,?,?,?,?,?,?)""", target, owner, input.kind(), input.date(), input.description().trim(),
                input.category() == null ? "" : input.category().trim(), input.projectId(), value);
        else {
            require(input.version() != null, "Version is required");
            int updated = db.update("""
                    UPDATE finance_transactions SET kind=?,occurred_on=?,description=?,category=?,project_id=?,amount=?,version=version+1
                    WHERE id=? AND owner_id=? AND version=? AND payment_id IS NULL AND cancelled_at IS NULL""",
                    input.kind(),input.date(),input.description().trim(),input.category()==null?"":input.category().trim(),input.projectId(),value,id,owner,input.version());
            if (updated == 0) { found(exists("finance_transactions", id, owner)); conflict("Transaction changed or cannot be edited"); }
        }
        return transaction(target, owner);
    }
    private boolean exists(String table, UUID id, UUID owner) {
        return db.queryForObject("SELECT count(*) FROM " + table + " WHERE id=? AND owner_id=?", Long.class, id, owner) > 0;
    }
    private Transaction transaction(UUID id, UUID owner) {
        return db.queryForObject("SELECT * FROM finance_transactions WHERE id=? AND owner_id=?", (rs,n) ->
                new Transaction(id,rs.getString("kind"),rs.getDate("occurred_on").toLocalDate(),rs.getString("description"),
                        rs.getString("category"),(UUID)rs.getObject("project_id"),amount(rs.getBigDecimal("amount")),
                        (UUID)rs.getObject("payment_id"),rs.getTimestamp("cancelled_at")!=null,rs.getLong("version")),id,owner);
    }
    @Transactional
    public Transaction cancelTransaction(UUID id, long version, String reason) {
        UUID owner = owner(); require(reason != null && !reason.isBlank(), "Cancellation reason is required");
        int updated = db.update("UPDATE finance_transactions SET cancelled_at=now(),cancel_reason=?,version=version+1 WHERE id=? AND owner_id=? AND version=? AND cancelled_at IS NULL AND payment_id IS NULL", reason.trim(), id,owner,version);
        if (updated == 0) { found(exists("finance_transactions",id,owner)); conflict("Transaction changed or cannot be cancelled"); }
        return transaction(id,owner);
    }

    @Transactional(readOnly = true)
    public Page<Invoice> invoices(String status, String search, LocalDate from, LocalDate to, int page, int limit) {
        UUID owner = owner(); int offset = page(page,limit);
        require(status == null || status.isBlank() || List.of("DRAFT","ISSUED","CANCELLED","PARTIALLY_PAID","PAID").contains(status),"Invalid status");
        String term = "%" + (search == null ? "" : search.trim().toLowerCase()) + "%";
        require(term.length() <= 102,"Search is too long");
        String where = """
                FROM finance_invoices i JOIN clients c ON c.id=i.client_id AND c.owner_id=i.owner_id
                WHERE i.owner_id=? AND (?='' OR CASE WHEN i.status='ISSUED' THEN
                  CASE WHEN coalesce((SELECT sum(received+withheld) FROM finance_payments p WHERE p.invoice_id=i.id AND p.cancelled_at IS NULL),0)>=i.total THEN 'PAID'
                       WHEN coalesce((SELECT sum(received+withheld) FROM finance_payments p WHERE p.invoice_id=i.id AND p.cancelled_at IS NULL),0)>0 THEN 'PARTIALLY_PAID'
                       ELSE 'ISSUED' END ELSE i.status END =?)
                AND (lower(coalesce(i.number,'')) LIKE ? OR lower(c.name) LIKE ?)
                AND (?::date IS NULL OR i.issue_date>=?) AND (?::date IS NULL OR i.issue_date<=?)""";
        Object[] args = {owner,status==null?"":status,status==null?"":status,term,term,from,from,to,to};
        Long total = db.queryForObject("SELECT count(*) "+where,Long.class,args);
        List<UUID> ids = db.query("SELECT i.id "+where+" ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?",(rs,n)->(UUID)rs.getObject(1),append(args,limit,offset));
        return new Page<>(invoicesQuery.findAll(ids,owner),total,page,limit);
    }
    @Transactional(readOnly = true)
    public Invoice invoice(UUID id) { return invoice(id,owner()); }
    private Invoice invoice(UUID id, UUID owner) {
        List<Invoice> result=invoicesQuery.findAll(List.of(id),owner);
        found(!result.isEmpty()); return result.get(0);
    }

    @Transactional
    public Invoice saveInvoice(UUID id, InvoiceInput input) {
        UUID owner=id==null?creationOwner():owner(); require(input!=null && input.clientId()!=null && input.issueDate()!=null && input.dueDate()!=null,"Client and dates are required");
        require(!input.dueDate().isBefore(input.issueDate()),"Due date precedes issue date");
        found(db.queryForObject("SELECT count(*) FROM clients WHERE id=? AND owner_id=?",Long.class,input.clientId(),owner)==1);
        project(owner,input.projectId(),input.clientId());
        FinancePolicy.Total total=FinancePolicy.calculate(input.lines(),input.discount(),input.vatRate());
        require(total.total().signum()>0,"Invoice total must be positive");
        UUID target=id==null?UUID.randomUUID():id;
        if(id==null) db.update("""
                INSERT INTO finance_invoices(id,owner_id,client_id,project_id,issue_date,due_date,vat_rate,discount,subtotal,vat,total,note)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",target,owner,input.clientId(),input.projectId(),input.issueDate(),input.dueDate(),total.vatRate(),total.discount(),total.subtotal(),total.vat(),total.total(),input.note()==null?"":input.note());
        else {
            require(input.version()!=null,"Version is required");
            int changed=db.update("""
                    UPDATE finance_invoices SET client_id=?,project_id=?,issue_date=?,due_date=?,vat_rate=?,discount=?,subtotal=?,vat=?,total=?,note=?,version=version+1,updated_at=now()
                    WHERE id=? AND owner_id=? AND version=? AND status='DRAFT'""",input.clientId(),input.projectId(),input.issueDate(),input.dueDate(),total.vatRate(),total.discount(),total.subtotal(),total.vat(),total.total(),input.note()==null?"":input.note(),id,owner,input.version());
            if(changed==0) { found(exists("finance_invoices",id,owner)); conflict("Invoice changed or is no longer a draft"); }
            db.update("DELETE FROM finance_invoice_lines WHERE invoice_id=?",id);
        }
        for(int i=0;i<total.lines().size();i++) {
            FinancePolicy.CalculatedLine line=total.lines().get(i);
            db.update("INSERT INTO finance_invoice_lines(invoice_id,position,description,quantity,unit,unit_price,amount) VALUES(?,?,?,?,?,?,?)",
                    target,i,line.description(),line.quantity(),line.unit(),line.unitPrice(),line.amount());
        }
        return invoice(target,owner);
    }
    @Transactional
    public Invoice issueInvoice(UUID id,long version) {
        UUID owner=owner(); Invoice draft=invoice(id,owner);
        require(draft.status().equals("DRAFT"),"Only draft invoices can be issued");
        var snapshot=identities.snapshot(owner,draft.clientId(),draft.vatRate());
        String number=numbers.next(owner,"INV",draft.issueDate());
        int updated=db.update("""
                UPDATE finance_invoices SET number=?,status='ISSUED',seller_snapshot=?::jsonb,buyer_snapshot=?::jsonb,brand_snapshot=?::jsonb,
                version=version+1,updated_at=now() WHERE id=? AND owner_id=? AND version=? AND status='DRAFT'""",
                number,snapshot.seller(),snapshot.buyer(),snapshot.brand(),id,owner,version);
        if(updated==0) conflict("Invoice changed; reload it");
        return invoice(id,owner);
    }
    @Transactional
    public Invoice cancelInvoice(UUID id,long version,String reason) {
        UUID owner=owner(); require(reason!=null && !reason.isBlank(),"Cancellation reason is required");
        found(!db.queryForList("SELECT id FROM finance_invoices WHERE id=? AND owner_id=? FOR UPDATE",id,owner).isEmpty());
        Long active=db.queryForObject("""
                SELECT (SELECT count(*) FROM finance_payments WHERE invoice_id=? AND cancelled_at IS NULL)
                     + (SELECT count(*) FROM finance_documents WHERE invoice_id=? AND status='ISSUED')""",Long.class,id,id);
        require(active==0,"Cancel payments and documents first");
        int changed=db.update("UPDATE finance_invoices SET status='CANCELLED',cancel_reason=?,version=version+1 WHERE id=? AND owner_id=? AND version=? AND status<>'CANCELLED'",reason,id,owner,version);
        if(changed==0) { found(exists("finance_invoices",id,owner)); conflict("Invoice changed or is already cancelled"); }
        return invoice(id,owner);
    }

    @Transactional(readOnly=true)
    public Page<Payment> payments(UUID invoiceId,String search,String status,LocalDate from,LocalDate to,int page,int limit) {
        UUID owner=owner(); int offset=page(page,limit);
        require(status==null || status.isBlank() || status.equals("ACTIVE") || status.equals("CANCELLED"),"Invalid payment status");
        String term="%"+(search==null?"":search.trim().toLowerCase())+"%"; require(term.length()<=102,"Search is too long");
        String where="""
                FROM finance_payments p JOIN finance_invoices i ON i.id=p.invoice_id AND i.owner_id=p.owner_id
                WHERE p.owner_id=? AND (?::uuid IS NULL OR p.invoice_id=?)
                AND (?='' OR (CASE WHEN p.cancelled_at IS NULL THEN 'ACTIVE' ELSE 'CANCELLED' END)=?)
                AND (lower(coalesce(i.number,'')) LIKE ? OR lower(p.reference) LIKE ?)
                AND (?::date IS NULL OR p.paid_on>=?) AND (?::date IS NULL OR p.paid_on<=?)""";
        Object[] args={owner,invoiceId,invoiceId,status==null?"":status,status==null?"":status,term,term,from,from,to,to};
        Long total=db.queryForObject("SELECT count(*) "+where,Long.class,args);
        List<Payment> items=db.query("SELECT p.* "+where+" ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
                (rs,n)->paymentRow(rs),append(args,limit,offset));
        return new Page<>(items,total,page,limit);
    }
    private Payment paymentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Payment((UUID)rs.getObject("id"),(UUID)rs.getObject("invoice_id"),rs.getDate("paid_on").toLocalDate(),
                amount(rs.getBigDecimal("received")),amount(rs.getBigDecimal("withheld")),rs.getString("method"),rs.getString("reference"),
                rs.getString("withholding_certificate"),rs.getTimestamp("cancelled_at")!=null,rs.getLong("version"));
    }
    @Transactional
    public Payment recordPayment(PaymentInput input) {
        UUID owner=creationOwner(); require(input!=null && input.invoiceId()!=null && input.date()!=null && input.idempotencyKey()!=null && !input.idempotencyKey().isBlank(),"Invoice, date and idempotency key are required");
        require(input.idempotencyKey().length()<=120,"Idempotency key is too long");
        require(input.method()==null || input.method().length()<=50,"Payment method is too long");
        require(input.reference()==null || input.reference().length()<=150,"Reference is too long");
        require(input.withholdingCertificate()==null || input.withholdingCertificate().length()<=150,"Certificate number is too long");
        db.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",owner.toString()+":"+input.idempotencyKey());
        // This row lock serializes all payments for one invoice, including the outstanding calculation.
        List<Map<String,Object>> locked=db.queryForList("SELECT id,status,total,project_id,number,seller_snapshot,buyer_snapshot,brand_snapshot FROM finance_invoices WHERE id=? AND owner_id=? FOR UPDATE",input.invoiceId(),owner);
        found(!locked.isEmpty()); Map<String,Object> invoice=locked.get(0);
        List<Payment> replay=db.query("SELECT * FROM finance_payments WHERE owner_id=? AND idempotency_key=?",(rs,n)->paymentRow(rs),owner,input.idempotencyKey());
        if(!replay.isEmpty()) {
            Payment previous=replay.get(0);
            if (!previous.invoiceId().equals(input.invoiceId()) || !previous.date().equals(input.date())
                    || !previous.received().equals(amount(FinancePolicy.money(input.received(),false)))
                    || !previous.withheld().equals(amount(FinancePolicy.money(input.withheld()==null?"0":input.withheld(),false)))
                    || !previous.method().equals(input.method()==null?"":input.method())
                    || !previous.reference().equals(input.reference()==null?"":input.reference())
                    || !previous.withholdingCertificate().equals(input.withholdingCertificate()==null?"":input.withholdingCertificate()))
                conflict("Idempotency key was already used with a different payment");
            return replay.get(0);
        }
        require("ISSUED".equals(invoice.get("status")),"Invoice is not issued");
        BigDecimal received=FinancePolicy.money(input.received(),false);
        BigDecimal withheld=FinancePolicy.money(input.withheld()==null?"0":input.withheld(),false);
        require(received.add(withheld).signum()>0,"Payment must be positive");
        BigDecimal paid=db.queryForObject("SELECT coalesce(sum(received+withheld),0) FROM finance_payments WHERE invoice_id=? AND cancelled_at IS NULL",BigDecimal.class,input.invoiceId());
        require(paid.add(received).add(withheld).compareTo((BigDecimal)invoice.get("total"))<=0,"Payment exceeds outstanding balance");
        UUID id=UUID.randomUUID();
        db.update("""
                INSERT INTO finance_payments(id,owner_id,invoice_id,paid_on,received,withheld,method,reference,withholding_certificate,idempotency_key)
                VALUES(?,?,?,?,?,?,?,?,?,?)""",id,owner,input.invoiceId(),input.date(),received,withheld,
                input.method()==null?"":input.method(),input.reference()==null?"":input.reference(),
                input.withholdingCertificate()==null?"":input.withholdingCertificate(),input.idempotencyKey());
        if(received.signum()>0) db.update("""
                INSERT INTO finance_transactions(owner_id,kind,occurred_on,description,category,project_id,amount,payment_id)
                VALUES(?,'INCOME',?,?,'Invoice payment',?,?,?)""",owner,input.date(),"Payment for "+invoice.get("number"),invoice.get("project_id"),received,id);
        db.update("""
                INSERT INTO finance_documents(owner_id,invoice_id,payment_id,type,number,issued_on,base_amount,vat_amount,description,seller_snapshot,buyer_snapshot,brand_snapshot)
                VALUES(?,?,?,'RECEIPT',?,?,?,0,?,?::jsonb,?::jsonb,?::jsonb)""",
                owner,input.invoiceId(),id,numbers.next(owner,"REC",input.date()),input.date(),received.add(withheld),
                "Receipt for "+invoice.get("number"),String.valueOf(invoice.get("seller_snapshot")),String.valueOf(invoice.get("buyer_snapshot")),String.valueOf(invoice.get("brand_snapshot")));
        return db.queryForObject("SELECT * FROM finance_payments WHERE id=? AND owner_id=?",(rs,n)->paymentRow(rs),id,owner);
    }
    @Transactional
    public Payment cancelPayment(UUID id,long version,String reason) {
        UUID owner=owner(); require(reason!=null && !reason.isBlank(),"Cancellation reason is required");
        List<UUID> invoices=db.query("SELECT invoice_id FROM finance_payments WHERE id=? AND owner_id=?",(rs,n)->(UUID)rs.getObject(1),id,owner);
        found(!invoices.isEmpty());
        db.queryForList("SELECT id FROM finance_invoices WHERE id=? AND owner_id=? FOR UPDATE",invoices.get(0),owner);
        int changed=db.update("UPDATE finance_payments SET cancelled_at=now(),cancel_reason=?,version=version+1 WHERE id=? AND owner_id=? AND version=? AND cancelled_at IS NULL",reason,id,owner,version);
        if(changed==0) { found(exists("finance_payments",id,owner)); conflict("Payment changed or is already cancelled"); }
        db.update("UPDATE finance_transactions SET cancelled_at=now(),cancel_reason=?,version=version+1 WHERE payment_id=? AND owner_id=? AND cancelled_at IS NULL",reason,id,owner);
        db.update("UPDATE finance_documents SET status='CANCELLED',cancelled_at=now(),cancel_reason=?,version=version+1 WHERE payment_id=? AND owner_id=? AND status='ISSUED'",reason,id,owner);
        return db.queryForObject("SELECT * FROM finance_payments WHERE id=? AND owner_id=?",(rs,n)->paymentRow(rs),id,owner);
    }
}
