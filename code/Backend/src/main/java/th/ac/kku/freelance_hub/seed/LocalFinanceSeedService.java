package th.ac.kku.freelance_hub.seed;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

/** Adds stable, owner-scoped finance examples without overwriting local edits. */
@Service
@Profile("local-seed")
@RequiredArgsConstructor
public class LocalFinanceSeedService {

    private static final String SELLER = """
            {"business_name":"Local Seed Studio","address":"123/1 ถนนมิตรภาพ ในเมือง เมืองขอนแก่น ขอนแก่น 40000","tax_id":"0105559000999","branch":"สำนักงานใหญ่","logo_asset_id":null,"bank_details":"Example Bank · 000-0-00000-0"}""";
    private static final String BUYER_MEKONG = """
            {"name":"Mekong Creative Studio [seed]","company_name":"Mekong Creative Co., Ltd.","address":"123/1 ถนนมิตรภาพ ในเมือง เมืองขอนแก่น ขอนแก่น 40000","tax_id":"0105559000001"}""";
    private static final String BUYER_NORTHSTAR = """
            {"name":"Northstar Learning [seed]","company_name":"Northstar Education","address":"88 ถนนกสิกรทุ่งสร้าง ในเมือง เมืองขอนแก่น ขอนแก่น 40000","tax_id":"0105559000002"}""";
    private static final String BRAND = """
            {"color":"#315bd7","footer":"Thank you · ขอบคุณที่ใช้บริการ"}""";

    private final JdbcTemplate db;

    public Result seed(UUID owner, Map<String, UUID> clients, Map<String, UUID> projects, LocalDate today) {
        if (!isPostgres()) {
            return new Result(Map.of(), Map.of());
        }

        Counts counts = new Counts();
        seedSettings(owner, counts);
        seedCategories(owner, counts);
        seedPresets(owner, counts);

        UUID quotationDraft = id(owner, "quotation-draft");
        UUID quotationIssued = id(owner, "quotation-issued");
        UUID quotationCancelled = id(owner, "quotation-cancelled");
        seedQuotation(quotationDraft, owner, clients.get("client-01"), projects.get("project-01"), null,
                "DRAFT", today, today.plusDays(30), "15000.00", "500.00", "7.00", "1015.00", "15515.00",
                null, null, null, "Draft website proposal", null, counts);
        seedLine("finance_quotation_lines", "quotation_id", quotationDraft, 0,
                "Website discovery and UX design", "2.000", "package", "7500.00", "15000.00");
        seedQuotation(quotationIssued, owner, clients.get("client-01"), projects.get("project-01"),
                quoteNumber(today, 1), "ISSUED", today.minusDays(5), today.plusDays(25), "20000.00", "0.00",
                "7.00", "1400.00", "21400.00", SELLER, BUYER_MEKONG, BRAND,
                "Issued quotation ready to convert or open as an invoice", null, counts);
        seedLine("finance_quotation_lines", "quotation_id", quotationIssued, 0,
                "Responsive website implementation", "1.000", "project", "20000.00", "20000.00");
        seedQuotation(quotationCancelled, owner, clients.get("client-02"), projects.get("project-02"),
                quoteNumber(today, 2), "CANCELLED", today.minusDays(40), today.minusDays(10), "10000.00",
                "0.00", "7.00", "700.00", "10700.00", SELLER, BUYER_NORTHSTAR, BRAND,
                "Historical quotation example", "Scope changed before approval", counts);
        seedLine("finance_quotation_lines", "quotation_id", quotationCancelled, 0,
                "Learning portal prototype", "1.000", "project", "10000.00", "10000.00");

        UUID invoiceDraft = id(owner, "invoice-draft");
        UUID invoicePartial = id(owner, "invoice-partial");
        UUID invoicePaid = id(owner, "invoice-paid");
        UUID invoiceCancelled = id(owner, "invoice-cancelled");
        seedInvoice(invoiceDraft, owner, clients.get("client-02"), projects.get("project-02"), null, "DRAFT",
                today, today.plusDays(30), "12000.00", "0.00", "7.00", "840.00", "12840.00",
                null, null, null, "Editable invoice draft", null, null, counts);
        seedLine("finance_invoice_lines", "invoice_id", invoiceDraft, 0,
                "Course dashboard design", "1.000", "project", "12000.00", "12000.00");
        seedInvoice(invoicePartial, owner, clients.get("client-01"), projects.get("project-01"),
                invoiceNumber(today, 1), "ISSUED", today.minusDays(5), today.plusDays(25), "20000.00", "0.00",
                "7.00", "1400.00", "21400.00", SELLER, BUYER_MEKONG, BRAND,
                "Created from the issued quotation seed", null, quotationIssued, counts);
        seedLine("finance_invoice_lines", "invoice_id", invoicePartial, 0,
                "Responsive website implementation", "1.000", "project", "20000.00", "20000.00");
        seedInvoice(invoicePaid, owner, clients.get("client-02"), projects.get("project-02"),
                invoiceNumber(today, 2), "ISSUED", today.minusDays(35), today.minusDays(5), "15000.00", "0.00",
                "7.00", "1050.00", "16050.00", SELLER, BUYER_NORTHSTAR, BRAND,
                "Fully paid invoice with withholding tax", null, null, counts);
        seedLine("finance_invoice_lines", "invoice_id", invoicePaid, 0,
                "Learning portal sprint", "1.000", "project", "15000.00", "15000.00");
        seedInvoice(invoiceCancelled, owner, clients.get("client-01"), projects.get("project-01"),
                invoiceNumber(today, 3), "CANCELLED", today.minusDays(60), today.minusDays(30), "8000.00",
                "0.00", "7.00", "560.00", "8560.00", SELLER, BUYER_MEKONG, BRAND,
                "Cancelled invoice example", "Replaced after scope correction", null, counts);
        seedLine("finance_invoice_lines", "invoice_id", invoiceCancelled, 0,
                "Original design scope", "1.000", "project", "8000.00", "8000.00");

        UUID partialPayment = seedPayment(owner, invoicePartial, today.minusDays(1), "10000.00", "0.00",
                "Bank transfer", "SEED-PARTIAL", "", "local-seed-partial", counts);
        UUID paidPayment = seedPayment(owner, invoicePaid, today.minusDays(7), "15000.00", "1050.00",
                "Bank transfer", "SEED-PAID", "WHT-SEED-001", "local-seed-paid", counts);
        seedTransaction(id(owner, "transaction-payment-partial"), owner, "INCOME", today.minusDays(1),
                "Payment for " + invoiceNumber(today, 1), "Invoice payment", projects.get("project-01"),
                "10000.00", partialPayment, false, counts);
        seedTransaction(id(owner, "transaction-payment-paid"), owner, "INCOME", today.minusDays(7),
                "Payment for " + invoiceNumber(today, 2), "Invoice payment", projects.get("project-02"),
                "15000.00", paidPayment, false, counts);
        seedTransaction(id(owner, "transaction-income"), owner, "INCOME", today.minusDays(12),
                "Consulting deposit", "Consulting", projects.get("project-03"), "6500.00", null, false, counts);
        seedTransaction(id(owner, "transaction-expense-software"), owner, "EXPENSE", today.minusDays(3),
                "Design software subscription", "Software", null, "1290.00", null, false, counts);
        seedTransaction(id(owner, "transaction-expense-travel"), owner, "EXPENSE", today.minusDays(9),
                "Client meeting travel", "Travel", projects.get("project-01"), "850.00", null, false, counts);
        seedTransaction(id(owner, "transaction-cancelled"), owner, "EXPENSE", today.minusDays(15),
                "Duplicate hosting charge", "Software", null, "590.00", null, true, counts);

        seedDocument(id(owner, "document-receipt-partial"), owner, invoicePartial, partialPayment, "RECEIPT",
                receiptNumber(today, 1), today.minusDays(1), "10000.00", "0.00",
                "Partial payment receipt", BUYER_MEKONG, counts);
        seedDocument(id(owner, "document-receipt-paid"), owner, invoicePaid, paidPayment, "RECEIPT",
                receiptNumber(today, 2), today.minusDays(7), "16050.00", "0.00",
                "Full payment receipt", BUYER_NORTHSTAR, counts);
        seedDocument(id(owner, "document-tax-paid"), owner, invoicePaid, paidPayment, "TAX_INVOICE",
                taxNumber(today, 1), today.minusDays(7), "15000.00", "1050.00",
                "Tax invoice for completed learning portal sprint", BUYER_NORTHSTAR, counts);

        return new Result(Map.copyOf(counts.created), Map.copyOf(counts.existing));
    }

    private void seedSettings(UUID owner, Counts counts) {
        boolean existing = existsByOwner("finance_settings", owner);
        if (!existing) {
            db.update("""
                    INSERT INTO finance_settings(owner_id,business_name,address,tax_id,branch,vat_registered,
                      bank_details,footer,brand_color)
                    VALUES(?,?,?,?,?,true,?,?,?)""", owner, "Local Seed Studio",
                    "123/1 ถนนมิตรภาพ ในเมือง เมืองขอนแก่น ขอนแก่น 40000", "0105559000999", "สำนักงานใหญ่",
                    "Example Bank · 000-0-00000-0", "Thank you · ขอบคุณที่ใช้บริการ", "#315bd7");
        }
        counts.add("finance setting", existing);
    }

    private void seedCategories(UUID owner, Counts counts) {
        seedCategory(owner, "category-income-design", "INCOME", "Design services", counts);
        seedCategory(owner, "category-income-consulting", "INCOME", "Consulting", counts);
        seedCategory(owner, "category-expense-software", "EXPENSE", "Software", counts);
        seedCategory(owner, "category-expense-travel", "EXPENSE", "Travel", counts);
    }

    private void seedCategory(UUID owner, String key, String kind, String name, Counts counts) {
        UUID id = id(owner, key);
        seedRow("finance category", "finance_categories", id, owner,
                () -> db.update("INSERT INTO finance_categories(id,owner_id,kind,name) VALUES(?,?,?,?)",
                        id, owner, kind, name), counts);
    }

    private void seedPresets(UUID owner, Counts counts) {
        seedPreset(owner, "preset-design", "UX design package", "Research, wireframes and interface design",
                "1.000", "package", "15000.00", "7.00", counts);
        seedPreset(owner, "preset-development", "Development day", "Frontend or backend implementation",
                "1.000", "day", "4500.00", "7.00", counts);
        seedPreset(owner, "preset-consulting", "Consulting hour", "Product and technical consultation",
                "1.000", "hour", "1500.00", "7.00", counts);
    }

    private void seedPreset(UUID owner, String key, String name, String description, String quantity, String unit,
            String price, String vatRate, Counts counts) {
        UUID id = id(owner, key);
        seedRow("finance preset", "finance_presets", id, owner,
                () -> db.update("""
                        INSERT INTO finance_presets(id,owner_id,name,description,quantity,unit,unit_price,suggested_vat_rate)
                        VALUES(?,?,?,?,?,?,?,?)""", id, owner, name, description, decimal(quantity), unit,
                        decimal(price), decimal(vatRate)), counts);
    }

    private void seedQuotation(UUID id, UUID owner, UUID client, UUID project, String number, String status,
            LocalDate issueDate, LocalDate validUntil, String subtotal, String discount, String vatRate, String vat,
            String total, String seller, String buyer, String brand, String note, String cancelReason, Counts counts) {
        seedRow("quotation", "finance_quotations", id, owner, () -> db.update("""
                INSERT INTO finance_quotations(id,owner_id,client_id,project_id,number,status,issue_date,valid_until,
                  vat_rate,discount,subtotal,vat,total,seller_snapshot,buyer_snapshot,brand_snapshot,note,cancel_reason)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),?,?)""",
                id, owner, client, project, number, status, issueDate, validUntil, decimal(vatRate), decimal(discount),
                decimal(subtotal), decimal(vat), decimal(total), seller, buyer, brand, note, cancelReason), counts);
    }

    private void seedInvoice(UUID id, UUID owner, UUID client, UUID project, String number, String status,
            LocalDate issueDate, LocalDate dueDate, String subtotal, String discount, String vatRate, String vat,
            String total, String seller, String buyer, String brand, String note, String cancelReason,
            UUID sourceQuotation, Counts counts) {
        seedRow("invoice", "finance_invoices", id, owner, () -> db.update("""
                INSERT INTO finance_invoices(id,owner_id,client_id,project_id,number,status,issue_date,due_date,
                  vat_rate,discount,subtotal,vat,total,seller_snapshot,buyer_snapshot,brand_snapshot,note,cancel_reason,
                  source_quotation_id)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),?,?,?)""",
                id, owner, client, project, number, status, issueDate, dueDate, decimal(vatRate), decimal(discount),
                decimal(subtotal), decimal(vat), decimal(total), seller, buyer, brand, note, cancelReason,
                sourceQuotation), counts);
    }

    private UUID seedPayment(UUID owner, UUID invoice, LocalDate date, String received, String withheld,
            String method, String reference, String certificate, String idempotencyKey, Counts counts) {
        UUID id = id(owner, "payment-" + idempotencyKey);
        seedRow("payment", "finance_payments", id, owner, () -> db.update("""
                INSERT INTO finance_payments(id,owner_id,invoice_id,paid_on,received,withheld,method,reference,
                  withholding_certificate,idempotency_key)
                VALUES(?,?,?,?,?,?,?,?,?,?)""", id, owner, invoice, date, decimal(received), decimal(withheld),
                method, reference, certificate, idempotencyKey), counts);
        return id;
    }

    private void seedTransaction(UUID id, UUID owner, String kind, LocalDate date, String description,
            String category, UUID project, String amount, UUID payment, boolean cancelled, Counts counts) {
        seedRow("transaction", "finance_transactions", id, owner, () -> db.update("""
                INSERT INTO finance_transactions(id,owner_id,kind,occurred_on,description,category,project_id,amount,
                  payment_id,cancelled_at,cancel_reason)
                VALUES(?,?,?,?,?,?,?,?,?,CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,
                  CASE WHEN ? THEN 'Duplicate local seed entry' ELSE NULL END)""",
                id, owner, kind, date, description, category, project, decimal(amount), payment, cancelled, cancelled),
                counts);
    }

    private void seedDocument(UUID id, UUID owner, UUID invoice, UUID payment, String type, String number,
            LocalDate date, String baseAmount, String vatAmount, String description, String buyer, Counts counts) {
        seedRow("finance document", "finance_documents", id, owner, () -> db.update("""
                INSERT INTO finance_documents(id,owner_id,invoice_id,payment_id,type,number,issued_on,base_amount,
                  vat_amount,description,seller_snapshot,buyer_snapshot,brand_snapshot)
                VALUES(?,?,?,?,?,?,?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb))""",
                id, owner, invoice, payment, type, number, date, decimal(baseAmount), decimal(vatAmount), description,
                SELLER, buyer, BRAND), counts);
    }

    private void seedLine(String table, String parentColumn, UUID parent, int position, String description,
            String quantity, String unit, String unitPrice, String amount) {
        UUID lineId = id(parent, table + "-line-" + position);
        db.update("INSERT INTO " + table + "(id," + parentColumn
                + ",position,description,quantity,unit,unit_price,amount) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING",
                lineId, parent, position, description, decimal(quantity), unit, decimal(unitPrice), decimal(amount));
    }

    private void seedRow(String kind, String table, UUID id, UUID owner, Insert insert, Counts counts) {
        boolean existing = exists(table, id, owner);
        if (!existing) {
            insert.run();
        }
        counts.add(kind, existing);
    }

    private boolean exists(String table, UUID id, UUID owner) {
        Integer count = db.queryForObject("SELECT count(*) FROM " + table + " WHERE id=? AND owner_id=?",
                Integer.class, id, owner);
        return count != null && count > 0;
    }

    private boolean existsByOwner(String table, UUID owner) {
        Integer count = db.queryForObject("SELECT count(*) FROM " + table + " WHERE owner_id=?", Integer.class, owner);
        return count != null && count > 0;
    }

    private boolean isPostgres() {
        return Boolean.TRUE.equals(db.execute((ConnectionCallback<Boolean>) connection ->
                "PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())));
    }

    private static UUID id(UUID owner, String key) {
        return UUID.nameUUIDFromBytes((owner + ":local-finance-seed:" + key).getBytes(StandardCharsets.UTF_8));
    }

    private static BigDecimal decimal(String value) {
        return new BigDecimal(value);
    }

    private static String quoteNumber(LocalDate date, int sequence) {
        return "QT-" + date.getYear() + "-SEED" + String.format("%02d", sequence);
    }

    private static String invoiceNumber(LocalDate date, int sequence) {
        return "INV-" + date.getYear() + "-SEED" + String.format("%02d", sequence);
    }

    private static String receiptNumber(LocalDate date, int sequence) {
        return "REC-" + date.getYear() + "-SEED" + String.format("%02d", sequence);
    }

    private static String taxNumber(LocalDate date, int sequence) {
        return "TAX-" + date.getYear() + "-SEED" + String.format("%02d", sequence);
    }

    @FunctionalInterface
    private interface Insert {
        void run();
    }

    private static final class Counts {
        private final Map<String, Integer> created = new LinkedHashMap<>();
        private final Map<String, Integer> existing = new LinkedHashMap<>();

        private void add(String kind, boolean alreadyExists) {
            (alreadyExists ? existing : created).merge(kind, 1, Integer::sum);
        }
    }

    public record Result(Map<String, Integer> created, Map<String, Integer> existing) {
    }
}
