package th.ac.kku.freelance_hub.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
public class FinanceTemplateService {
    private final JdbcTemplate db;
    private final th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers;
    private final FinanceService finance;
    public record Settings(String businessName,String address,String taxId,String branch,boolean vatRegistered,
                           String bankDetails,String footer,String brandColor,UUID logoAssetId,long version) {}
    public record Preset(UUID id,String name,String description,String quantity,String unit,String unitPrice,String suggestedVatRate,long version) {}
    public record Category(UUID id,String kind,String name,long version) {}
    public record TaxIssue(UUID invoiceId,LocalDate date,String baseAmount,String description,UUID replacesId) {}
    public record Document(UUID id,UUID invoiceId,UUID paymentId,String type,String number,LocalDate date,String status,
                           String baseAmount,String vatAmount,String description,String sellerSnapshot,String buyerSnapshot,
                           String brandSnapshot,UUID replacesId,long version) {}
    private FinanceException fail(HttpStatus status,String code,String message) { return new FinanceException(status,code,message); }
    private void require(boolean ok,String message) { if(!ok) throw fail(HttpStatus.BAD_REQUEST,"FINANCE_VALIDATION",message); }
    private void found(boolean ok) { if(!ok) throw fail(HttpStatus.NOT_FOUND,"FINANCE_NOT_FOUND","Finance item not found"); }
    private String amount(BigDecimal value) { return value.setScale(2).toPlainString(); }
    private void ensureSettings(UUID owner) {
        db.update("""
                INSERT INTO finance_settings(owner_id,business_name,address)
                SELECT ?,coalesce(display_name,''),coalesce(address,'') FROM user_profiles WHERE user_id=?
                ON CONFLICT(owner_id) DO NOTHING""",owner,owner);
        db.update("INSERT INTO finance_settings(owner_id) VALUES(?) ON CONFLICT(owner_id) DO NOTHING",owner);
    }
    @Transactional
    public Settings settings() { UUID owner=finance.owner(); ensureSettings(owner); return settings(owner); }
    private Settings settings(UUID owner) {
        return db.queryForObject("SELECT * FROM finance_settings WHERE owner_id=?",(rs,n)->new Settings(rs.getString("business_name"),
                rs.getString("address"),rs.getString("tax_id"),rs.getString("branch"),rs.getBoolean("vat_registered"),
                rs.getString("bank_details"),rs.getString("footer"),rs.getString("brand_color"),(UUID)rs.getObject("logo_asset_id"),rs.getLong("version")),owner);
    }
    @Transactional
    public Settings saveSettings(Settings input) {
        UUID owner=finance.owner(); ensureSettings(owner);
        require(input!=null && input.businessName()!=null && input.address()!=null,"Business name and address are required");
        require(input.brandColor()!=null && input.brandColor().matches("#[0-9a-fA-F]{6}"),"Invalid brand color");
        if(input.logoAssetId()!=null) found(db.queryForObject("SELECT count(*) FROM finance_assets WHERE id=? AND owner_id=?",Long.class,input.logoAssetId(),owner)==1);
        int changed=db.update("""
                UPDATE finance_settings SET business_name=?,address=?,tax_id=?,branch=?,vat_registered=?,bank_details=?,footer=?,brand_color=?,logo_asset_id=?,version=version+1,updated_at=now()
                WHERE owner_id=? AND version=?""",input.businessName().trim(),input.address().trim(),input.taxId()==null?"":input.taxId().trim(),
                input.branch()==null?"":input.branch().trim(),input.vatRegistered(),input.bankDetails()==null?"":input.bankDetails(),
                input.footer()==null?"":input.footer(),input.brandColor(),input.logoAssetId(),owner,input.version());
        if(changed==0) throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Settings changed; reload them");
        return settings(owner);
    }
    @Transactional
    public UUID uploadLogo(String contentType,byte[] content) {
        UUID owner=finance.owner(); require(("image/png".equals(contentType)||"image/jpeg".equals(contentType)) && content!=null && content.length>0 && content.length<=1048576,"Logo must be PNG or JPEG, at most 1 MB");
        boolean png = content.length >= 8 && content[0] == (byte)0x89 && content[1] == 'P' && content[2] == 'N' && content[3] == 'G'
                && content[4] == 13 && content[5] == 10 && content[6] == 26 && content[7] == 10;
        boolean jpeg = content.length >= 3 && content[0] == (byte)0xff && content[1] == (byte)0xd8 && content[2] == (byte)0xff;
        require(("image/png".equals(contentType) && png) || ("image/jpeg".equals(contentType) && jpeg),"Logo content does not match PNG/JPEG type");
        UUID id=UUID.randomUUID(); db.update("INSERT INTO finance_assets(id,owner_id,content_type,content) VALUES(?,?,?,?)",id,owner,contentType,content); return id;
    }
    @Transactional(readOnly=true)
    public byte[] logo(UUID id) {
        UUID owner=finance.owner(); List<byte[]> data=db.query("SELECT content FROM finance_assets WHERE id=? AND owner_id=?",(rs,n)->rs.getBytes(1),id,owner);
        found(!data.isEmpty()); return data.get(0);
    }
    @Transactional(readOnly=true)
    public String logoType(UUID id) {
        UUID owner=finance.owner(); List<String> data=db.query("SELECT content_type FROM finance_assets WHERE id=? AND owner_id=?",(rs,n)->rs.getString(1),id,owner);
        found(!data.isEmpty()); return data.get(0);
    }
    @Transactional(readOnly=true)
    public List<Preset> presets() {
        UUID owner=finance.owner(); return db.query("SELECT * FROM finance_presets WHERE owner_id=? ORDER BY name",(rs,n)->new Preset((UUID)rs.getObject("id"),rs.getString("name"),rs.getString("description"),
                rs.getBigDecimal("quantity").toPlainString(),rs.getString("unit"),amount(rs.getBigDecimal("unit_price")),rs.getBigDecimal("suggested_vat_rate").toPlainString(),rs.getLong("version")),owner);
    }
    @Transactional
    public Preset savePreset(UUID id,Preset input) {
        UUID owner=id==null?finance.creationOwner():finance.owner(); require(input!=null && input.name()!=null && !input.name().isBlank() && input.description()!=null && !input.description().isBlank(),"Preset name and description are required");
        require(input.name().length()<=120,"Preset name is too long");
        FinancePolicy.Total calculated=FinancePolicy.calculate(List.of(new FinancePolicy.Line(input.description(),input.quantity(),input.unit(),input.unitPrice())),"0",input.suggestedVatRate());
        FinancePolicy.CalculatedLine line=calculated.lines().get(0);
        BigDecimal quantity=line.quantity(); BigDecimal rate=calculated.vatRate();
        BigDecimal price=line.unitPrice(); UUID target=id==null?UUID.randomUUID():id;
        if(id==null) db.update("INSERT INTO finance_presets(id,owner_id,name,description,quantity,unit,unit_price,suggested_vat_rate) VALUES(?,?,?,?,?,?,?,?)",
                target,owner,input.name().trim(),input.description().trim(),quantity,input.unit()==null?"":input.unit(),price,rate);
        else {
            int changed=db.update("UPDATE finance_presets SET name=?,description=?,quantity=?,unit=?,unit_price=?,suggested_vat_rate=?,version=version+1 WHERE id=? AND owner_id=? AND version=?",
                    input.name().trim(),input.description().trim(),quantity,input.unit()==null?"":input.unit(),price,rate,id,owner,input.version());
            if(changed==0) { found(db.queryForObject("SELECT count(*) FROM finance_presets WHERE id=? AND owner_id=?",Long.class,id,owner)==1); throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Preset changed or was removed"); }
        }
        return presets().stream().filter(p->p.id().equals(target)).findFirst().orElseThrow();
    }
    @Transactional
    public void deletePreset(UUID id,long version) {
        UUID owner=finance.owner(); int changed=db.update("DELETE FROM finance_presets WHERE id=? AND owner_id=? AND version=?",id,owner,version);
        if(changed==0) { found(db.queryForObject("SELECT count(*) FROM finance_presets WHERE id=? AND owner_id=?",Long.class,id,owner)==1); throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Preset changed or was removed"); }
    }
    @Transactional(readOnly=true)
    public List<Category> categories() {
        UUID owner=finance.owner(); return db.query("SELECT * FROM finance_categories WHERE owner_id=? ORDER BY kind,name",(rs,n)->new Category((UUID)rs.getObject("id"),rs.getString("kind"),rs.getString("name"),rs.getLong("version")),owner);
    }
    @Transactional
    public Category saveCategory(UUID id,Category input) {
        UUID owner=id==null?finance.creationOwner():finance.owner(); require(input!=null && ("INCOME".equals(input.kind())||"EXPENSE".equals(input.kind())) && input.name()!=null && !input.name().isBlank(),"Kind and name are required");
        require(input.name().length()<=100,"Category name is too long");
        UUID target=id==null?UUID.randomUUID():id;
        try {
        if(id==null) db.update("INSERT INTO finance_categories(id,owner_id,kind,name) VALUES(?,?,?,?)",target,owner,input.kind(),input.name().trim());
        else if(db.update("UPDATE finance_categories SET kind=?,name=?,version=version+1 WHERE id=? AND owner_id=? AND version=?",input.kind(),input.name().trim(),id,owner,input.version())==0) {
            found(db.queryForObject("SELECT count(*) FROM finance_categories WHERE id=? AND owner_id=?",Long.class,id,owner)==1);
            throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Category changed or was removed");
        }
        } catch (org.springframework.dao.DuplicateKeyException ex) {
            throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","This category already exists");
        }
        return categories().stream().filter(c->c.id().equals(target)).findFirst().orElseThrow();
    }
    @Transactional
    public void deleteCategory(UUID id,long version) {
        UUID owner=finance.owner(); if(db.update("DELETE FROM finance_categories WHERE id=? AND owner_id=? AND version=?",id,owner,version)==0) {
            found(db.queryForObject("SELECT count(*) FROM finance_categories WHERE id=? AND owner_id=?",Long.class,id,owner)==1);
            throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Category changed or was removed");
        }
    }
    private Document row(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Document((UUID)rs.getObject("id"),(UUID)rs.getObject("invoice_id"),(UUID)rs.getObject("payment_id"),
                rs.getString("type"),rs.getString("number"),rs.getDate("issued_on").toLocalDate(),rs.getString("status"),
                amount(rs.getBigDecimal("base_amount")),amount(rs.getBigDecimal("vat_amount")),rs.getString("description"),
                rs.getString("seller_snapshot"),rs.getString("buyer_snapshot"),rs.getString("brand_snapshot"),
                (UUID)rs.getObject("replaces_id"),rs.getLong("version"));
    }
    @Transactional(readOnly=true)
    public FinanceService.Page<Document> documents(UUID invoiceId,String type,String status,LocalDate from,LocalDate to,int page,int limit) {
        UUID owner=finance.owner(); require(page>0 && page<=1_000_000 && limit>0 && limit<=100,"Invalid pagination");
        require(type==null || type.isBlank() || type.equals("RECEIPT") || type.equals("TAX_INVOICE"),"Invalid document type");
        require(status==null || status.isBlank() || status.equals("ISSUED") || status.equals("CANCELLED"),"Invalid document status");
        String where="""
                FROM finance_documents WHERE owner_id=? AND (?::uuid IS NULL OR invoice_id=?)
                AND (?='' OR type=?) AND (?='' OR status=?)
                AND (?::date IS NULL OR issued_on>=?) AND (?::date IS NULL OR issued_on<=?)""";
        Object[] args={owner,invoiceId,invoiceId,type==null?"":type,type==null?"":type,status==null?"":status,status==null?"":status,from,from,to,to};
        Long total=db.queryForObject("SELECT count(*) "+where,Long.class,args);
        Object[] pageArgs=java.util.Arrays.copyOf(args,args.length+2); pageArgs[args.length]=limit; pageArgs[args.length+1]=(page-1)*limit;
        List<Document> rows=db.query("SELECT * "+where+" ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",(rs,n)->row(rs),pageArgs);
        return new FinanceService.Page<>(rows,total,page,limit);
    }
    @Transactional(readOnly=true)
    public Document receipt(UUID paymentId) {
        UUID owner=finance.owner();
        List<Document> rows=db.query("SELECT * FROM finance_documents WHERE payment_id=? AND owner_id=? AND type='RECEIPT' ORDER BY created_at DESC, id DESC LIMIT 1",(rs,n)->row(rs),paymentId,owner);
        found(!rows.isEmpty()); return rows.get(0);
    }
    @Transactional(readOnly=true)
    public Document document(UUID id) {
        UUID owner=finance.owner(); List<Document> rows=db.query("SELECT * FROM finance_documents WHERE id=? AND owner_id=?",(rs,n)->row(rs),id,owner);
        found(!rows.isEmpty()); return rows.get(0);
    }
    @Transactional
    public Document issueTax(TaxIssue input) {
        UUID owner=finance.creationOwner(); require(input!=null && input.invoiceId()!=null && input.date()!=null && input.description()!=null && !input.description().isBlank(),"Invoice, date and service description are required");
        List<Map<String,Object>> rows=db.queryForList("SELECT * FROM finance_invoices WHERE id=? AND owner_id=? FOR UPDATE",input.invoiceId(),owner);
        found(!rows.isEmpty()); Map<String,Object> invoice=rows.get(0);
        require("ISSUED".equals(invoice.get("status")),"Only issued invoices can have tax invoices");
        require(((BigDecimal)invoice.get("vat_rate")).signum()>0,"Invoice has no VAT");
        BigDecimal base=FinancePolicy.money(input.baseAmount(),true);
        BigDecimal used=db.queryForObject("SELECT coalesce(sum(base_amount),0) FROM finance_documents WHERE invoice_id=? AND type='TAX_INVOICE' AND status='ISSUED'",BigDecimal.class,input.invoiceId());
        BigDecimal max=((BigDecimal)invoice.get("subtotal")).subtract((BigDecimal)invoice.get("discount"));
        require(used.add(base).compareTo(max)<=0,"Tax invoice base exceeds invoice net amount");
        BigDecimal usedVat=db.queryForObject("SELECT coalesce(sum(vat_amount),0) FROM finance_documents WHERE invoice_id=? AND type='TAX_INVOICE' AND status='ISSUED'",BigDecimal.class,input.invoiceId());
        BigDecimal vat=FinancePolicy.allocateVat(base,max.subtract(used),(BigDecimal)invoice.get("vat_rate"),((BigDecimal)invoice.get("vat")).subtract(usedVat));
        UUID replacement=input.replacesId();
        if(replacement!=null) {
            Document previous=document(replacement);
            require(previous.invoiceId().equals(input.invoiceId()) && previous.type().equals("TAX_INVOICE") && previous.status().equals("CANCELLED"),"Replacement must reference a cancelled tax invoice on this invoice");
        }
        UUID id=UUID.randomUUID(); db.update("""
                INSERT INTO finance_documents(id,owner_id,invoice_id,type,number,issued_on,base_amount,vat_amount,description,seller_snapshot,buyer_snapshot,brand_snapshot,replaces_id)
                VALUES(?,?,?,'TAX_INVOICE',?,?,?,?,?,?::jsonb,?::jsonb,?::jsonb,?)""",id,owner,input.invoiceId(),numbers.next(owner,"TAX",input.date()),
                input.date(),base,vat,input.description().trim(),invoice.get("seller_snapshot"),invoice.get("buyer_snapshot"),invoice.get("brand_snapshot"),replacement);
        return document(id);
    }
    @Transactional
    public Document cancelDocument(UUID id,long version,String reason) {
        UUID owner=finance.owner(); require(reason!=null && !reason.isBlank(),"Cancellation reason is required");
        Document current=document(id);
        db.queryForList("SELECT id FROM finance_invoices WHERE id=? AND owner_id=? FOR UPDATE",current.invoiceId(),owner);
        int changed=db.update("UPDATE finance_documents SET status='CANCELLED',cancelled_at=now(),cancel_reason=?,version=version+1 WHERE id=? AND owner_id=? AND version=? AND status='ISSUED'",reason.trim(),id,owner,version);
        if(changed==0) { found(db.queryForObject("SELECT count(*) FROM finance_documents WHERE id=? AND owner_id=?",Long.class,id,owner)==1); throw fail(HttpStatus.CONFLICT,"FINANCE_CONFLICT","Document changed or is already cancelled"); }
        return document(id);
    }
}
