package th.ac.kku.freelance_hub.repository.finance;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import lombok.RequiredArgsConstructor;
import th.ac.kku.freelance_hub.service.FinanceService.Invoice;
import th.ac.kku.freelance_hub.service.FinancePolicy.LineResponse;

/** Load headers and lines in two queries regardless of the page size. */
@Repository @RequiredArgsConstructor
public class FinanceInvoiceQuery {
    private final JdbcTemplate db;
    private String amount(BigDecimal value) { return value.setScale(2).toPlainString(); }
    public List<Invoice> findAll(List<UUID> ids,UUID owner) {
        if(ids.isEmpty()) return List.of();
        String placeholders=String.join(",",Collections.nCopies(ids.size(),"?"));
        var args=new ArrayList<Object>(ids); args.add(owner);
        Map<UUID,List<LineResponse>> lines=new HashMap<>();
        db.query("SELECT l.* FROM finance_invoice_lines l JOIN finance_invoices i ON i.id=l.invoice_id WHERE i.id IN ("+placeholders+") AND i.owner_id=? ORDER BY l.position",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> lines.computeIfAbsent((UUID)rs.getObject("invoice_id"),key->new ArrayList<>()).add(
                        new LineResponse(rs.getString("description"),rs.getBigDecimal("quantity").toPlainString(),rs.getString("unit"),amount(rs.getBigDecimal("unit_price")),amount(rs.getBigDecimal("amount")))),args.toArray());
        List<Invoice> result=db.query("""
                SELECT i.*,coalesce((SELECT sum(received+withheld) FROM finance_payments p WHERE p.invoice_id=i.id AND p.cancelled_at IS NULL),0) paid,
                    coalesce((SELECT sum(base_amount) FROM finance_documents d WHERE d.invoice_id=i.id AND d.type='TAX_INVOICE' AND d.status='ISSUED'),0) tax_issued_base
                FROM finance_invoices i WHERE i.id IN (
                """+placeholders+") AND i.owner_id=?",(rs,n)-> {
            UUID id=(UUID)rs.getObject("id"); BigDecimal paid=rs.getBigDecimal("paid"); String status=rs.getString("status");
            if(status.equals("ISSUED")) status=paid.compareTo(rs.getBigDecimal("total"))>=0?"PAID":paid.signum()>0?"PARTIALLY_PAID":"ISSUED";
            return new Invoice(id,rs.getString("number"),(UUID)rs.getObject("client_id"),(UUID)rs.getObject("project_id"),
                    rs.getDate("issue_date").toLocalDate(),rs.getDate("due_date").toLocalDate(),status,
                    amount(rs.getBigDecimal("subtotal")),amount(rs.getBigDecimal("discount")),rs.getBigDecimal("vat_rate").toPlainString(),
                    amount(rs.getBigDecimal("vat")),amount(rs.getBigDecimal("total")),amount(paid),rs.getLong("version"),lines.getOrDefault(id,List.of()),
                    rs.getString("seller_snapshot"),rs.getString("buyer_snapshot"),rs.getString("brand_snapshot"),rs.getString("note"),amount(rs.getBigDecimal("tax_issued_base")),(UUID)rs.getObject("source_quotation_id"));
        },args.toArray());
        Map<UUID,Invoice> byId=new HashMap<>(); result.forEach(item->byId.put(item.id(),item));
        return ids.stream().filter(byId::containsKey).map(byId::get).toList();
    }
}
