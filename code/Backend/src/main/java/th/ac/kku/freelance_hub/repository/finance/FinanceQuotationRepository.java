package th.ac.kku.freelance_hub.repository.finance;

import java.util.*;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import th.ac.kku.freelance_hub.service.FinancePolicy;
import th.ac.kku.freelance_hub.service.FinanceQuotationService.QuotationInput;
import th.ac.kku.freelance_hub.service.FinanceQuotationService.Quotation;
import th.ac.kku.freelance_hub.service.FinanceDocumentIdentity.Snapshot;
import th.ac.kku.freelance_hub.service.FinanceService.Page;

@Repository
@RequiredArgsConstructor
public class FinanceQuotationRepository {
    private final JdbcTemplate db;

    public boolean clientOwned(UUID owner, UUID client) {
        return db.queryForObject("SELECT count(*) FROM clients WHERE id=? AND owner_id=?", Long.class, client, owner) == 1;
    }
    public boolean projectMatches(UUID owner, UUID client, UUID project) {
        return project == null || db.queryForObject("SELECT count(*) FROM projects WHERE id=? AND owner_id=? AND client_id=?",
                Long.class, project, owner, client) == 1;
    }
    public boolean lock(UUID id, UUID owner) {
        return !db.queryForList("SELECT id FROM finance_quotations WHERE id=? AND owner_id=? FOR UPDATE", id, owner).isEmpty();
    }
    public Quotation find(UUID id, UUID owner) {
        var result = findAll(List.of(id), owner);
        return result.isEmpty() ? null : result.get(0);
    }
    private List<Quotation> findAll(List<UUID> ids, UUID owner) {
        if (ids.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        var args = new ArrayList<Object>(ids); args.add(owner);
        Map<UUID, List<FinancePolicy.LineResponse>> lines = new HashMap<>();
        db.query("SELECT l.* FROM finance_quotation_lines l JOIN finance_quotations q ON q.id=l.quotation_id WHERE q.id IN (" + placeholders + ") AND q.owner_id=? ORDER BY l.position",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> lines.computeIfAbsent((UUID)rs.getObject("quotation_id"), key -> new ArrayList<>()).add(
                        new FinancePolicy.LineResponse(rs.getString("description"), rs.getBigDecimal("quantity").toPlainString(), rs.getString("unit"),
                                rs.getBigDecimal("unit_price").setScale(2).toPlainString(), rs.getBigDecimal("amount").setScale(2).toPlainString())), args.toArray());
        var records = db.query("SELECT q.*,i.id AS invoice_id FROM finance_quotations q LEFT JOIN finance_invoices i ON i.source_quotation_id=q.id AND i.owner_id=q.owner_id WHERE q.id IN (" + placeholders + ") AND q.owner_id=?",
                (rs,n) -> new Quotation((UUID)rs.getObject("id"), rs.getString("number"), (UUID)rs.getObject("client_id"),
                        (UUID)rs.getObject("project_id"), rs.getDate("issue_date").toLocalDate(), rs.getDate("valid_until").toLocalDate(), rs.getString("status"),
                        rs.getBigDecimal("subtotal").setScale(2).toPlainString(), rs.getBigDecimal("discount").setScale(2).toPlainString(),
                        rs.getBigDecimal("vat_rate").toPlainString(), rs.getBigDecimal("vat").setScale(2).toPlainString(), rs.getBigDecimal("total").setScale(2).toPlainString(),
                        rs.getLong("version"), lines.getOrDefault((UUID)rs.getObject("id"), List.of()), rs.getString("seller_snapshot"),
                        rs.getString("buyer_snapshot"), rs.getString("brand_snapshot"), rs.getString("note"), (UUID)rs.getObject("invoice_id")), args.toArray());
        Map<UUID, Quotation> byId = new HashMap<>(); records.forEach(item -> byId.put(item.id(), item));
        return ids.stream().filter(byId::containsKey).map(byId::get).toList();
    }
    public Page<Quotation> list(UUID owner, String status, String search, LocalDate from, LocalDate to, int page, int limit) {
        String term = "%" + search.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        String where = """
                FROM finance_quotations q JOIN clients c ON c.id=q.client_id AND c.owner_id=q.owner_id
                WHERE q.owner_id=? AND (?='' OR q.status=?)
                AND (lower(coalesce(q.number,'')) LIKE ? ESCAPE '!' OR lower(c.name) LIKE ? ESCAPE '!')
                AND (?::date IS NULL OR q.issue_date>=?) AND (?::date IS NULL OR q.issue_date<=?)""";
        Object[] args = {owner,status,status,term,term,from,from,to,to};
        long total = db.queryForObject("SELECT count(*) " + where, Long.class, args);
        var pageArgs = new ArrayList<>(Arrays.asList(args)); pageArgs.add(limit); pageArgs.add((page-1)*limit);
        var ids = db.query("SELECT q.id " + where + " ORDER BY q.created_at DESC,q.id DESC LIMIT ? OFFSET ?",
                (rs,n) -> (UUID)rs.getObject(1), pageArgs.toArray());
        return new Page<>(findAll(ids,owner), total, page, limit);
    }
    public void insert(UUID id, UUID owner, QuotationInput input, FinancePolicy.Total totals) {
        db.update("""
                INSERT INTO finance_quotations(id,owner_id,client_id,project_id,issue_date,valid_until,vat_rate,discount,subtotal,vat,total,note)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""", id,owner,input.clientId(),input.projectId(),input.issueDate(),input.validUntil(),
                totals.vatRate(),totals.discount(),totals.subtotal(),totals.vat(),totals.total(),input.note()==null?"":input.note());
        replaceLines(id,totals);
    }
    public boolean update(UUID id, UUID owner, QuotationInput input, FinancePolicy.Total totals) {
        int changed = db.update("""
                UPDATE finance_quotations SET client_id=?,project_id=?,issue_date=?,valid_until=?,vat_rate=?,discount=?,subtotal=?,vat=?,total=?,note=?,version=version+1,updated_at=now()
                WHERE id=? AND owner_id=? AND version=? AND status='DRAFT'""", input.clientId(),input.projectId(),input.issueDate(),input.validUntil(),
                totals.vatRate(),totals.discount(),totals.subtotal(),totals.vat(),totals.total(),input.note()==null?"":input.note(),id,owner,input.version());
        if (changed == 1) replaceLines(id,totals);
        return changed == 1;
    }
    private void replaceLines(UUID id, FinancePolicy.Total totals) {
        db.update("DELETE FROM finance_quotation_lines WHERE quotation_id=?",id);
        for(int i=0;i<totals.lines().size();i++) {
            var line = totals.lines().get(i);
            db.update("INSERT INTO finance_quotation_lines(quotation_id,position,description,quantity,unit,unit_price,amount) VALUES(?,?,?,?,?,?,?)",
                    id,i,line.description(),line.quantity(),line.unit(),line.unitPrice(),line.amount());
        }
    }
    public boolean issue(UUID id, UUID owner, long version, String number, Snapshot snapshot) {
        return db.update("""
                UPDATE finance_quotations SET status='ISSUED',number=?,seller_snapshot=?::jsonb,buyer_snapshot=?::jsonb,brand_snapshot=?::jsonb,version=version+1,updated_at=now()
                WHERE id=? AND owner_id=? AND version=? AND status='DRAFT'""",number,snapshot.seller(),snapshot.buyer(),snapshot.brand(),id,owner,version)==1;
    }
    public boolean cancel(UUID id, UUID owner, long version, String reason) {
        return db.update("UPDATE finance_quotations SET status='CANCELLED',cancel_reason=?,version=version+1,updated_at=now() WHERE id=? AND owner_id=? AND version=? AND status<>'CANCELLED'",
                reason,id,owner,version)==1;
    }
    public void linkInvoice(UUID invoice, UUID quotation, UUID owner) {
        db.update("UPDATE finance_invoices SET source_quotation_id=? WHERE id=? AND owner_id=?",quotation,invoice,owner);
    }
}
