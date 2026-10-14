package th.ac.kku.freelance_hub.integration;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Callable;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import th.ac.kku.freelance_hub.service.*;
import th.ac.kku.freelance_hub.exception.FinanceException;
import th.ac.kku.freelance_hub.seed.LocalFinanceSeedService;

/** Real PostgreSQL, real transactional proxies, isolated schema removed after the suite. */
@SpringJUnitConfig(FinancePostgresIntegrationTest.Config.class)
@EnabledIfEnvironmentVariable(named="FINANCE_TEST_DATABASE_URL", matches=".+")
class FinancePostgresIntegrationTest {
    private static final String SCHEMA="finance_test_"+UUID.randomUUID().toString().replace("-", "");
    private static final ThreadLocal<UUID> OWNER=new ThreadLocal<>();
    private static final LocalDate DATE=LocalDate.of(2026,10,12);
    @Configuration @EnableTransactionManagement(proxyTargetClass=true)
    static class Config {
        @Bean DataSource dataSource() {
            var source=new DriverManagerDataSource(System.getenv("FINANCE_TEST_DATABASE_URL"),
                    System.getenv("FINANCE_TEST_DATABASE_USER"), System.getenv("FINANCE_TEST_DATABASE_PASSWORD"));
            Flyway.configure().dataSource(source).schemas(SCHEMA).defaultSchema(SCHEMA)
                    .locations("classpath:db/migration").load().migrate();
            var properties=new java.util.Properties();
            properties.setProperty("currentSchema",SCHEMA);
            source.setConnectionProperties(properties);
            return source;
        }
        @Bean JdbcTemplate jdbc(DataSource source) { return new JdbcTemplate(source); }
        @Bean DataSourceTransactionManager transactionManager(DataSource source) { return new DataSourceTransactionManager(source); }
        @Bean CurrentUserProvider owner() { return OWNER::get; }
        @Bean th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers(JdbcTemplate jdbc) { return new th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers(jdbc); }
        @Bean th.ac.kku.freelance_hub.repository.finance.FinanceInvoiceQuery invoicesQuery(JdbcTemplate jdbc) { return new th.ac.kku.freelance_hub.repository.finance.FinanceInvoiceQuery(jdbc); }
        @Bean th.ac.kku.freelance_hub.repository.FeatureSettingsRepository featureRepository(JdbcTemplate jdbc) { return new th.ac.kku.freelance_hub.repository.FeatureSettingsRepository(jdbc); }
        @Bean FeatureAccessService access(th.ac.kku.freelance_hub.repository.FeatureSettingsRepository repository, CurrentUserProvider owner) { return new FeatureAccessService(repository, owner); }
        @Bean th.ac.kku.freelance_hub.repository.finance.FinanceIdentityRepository identityRepository(JdbcTemplate jdbc) { return new th.ac.kku.freelance_hub.repository.finance.FinanceIdentityRepository(jdbc); }
        @Bean FinanceDocumentIdentity identities(th.ac.kku.freelance_hub.repository.finance.FinanceIdentityRepository repository) { return new FinanceDocumentIdentity(repository); }
        @Bean th.ac.kku.freelance_hub.repository.finance.FinanceQuotationRepository quotationRepository(JdbcTemplate jdbc) { return new th.ac.kku.freelance_hub.repository.finance.FinanceQuotationRepository(jdbc); }
        @Bean FinanceQuotationService quotations(th.ac.kku.freelance_hub.repository.finance.FinanceQuotationRepository repository, FeatureAccessService access, FinanceDocumentIdentity identities, th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers, FinanceService finance) { return new FinanceQuotationService(repository,access,identities,numbers,finance); }
        @Bean FinanceService finance(JdbcTemplate jdbc,FeatureAccessService access,FinanceDocumentIdentity identities,th.ac.kku.freelance_hub.repository.finance.FinanceInvoiceQuery query,th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers) { return new FinanceService(jdbc,query,numbers,access,identities); }
        @Bean FinanceTemplateService templates(JdbcTemplate jdbc,FinanceService finance,th.ac.kku.freelance_hub.repository.finance.FinanceDocumentNumbers numbers) { return new FinanceTemplateService(jdbc,numbers,finance); }
    }
    @Autowired JdbcTemplate db;
    @Autowired FinanceService finance;
    @Autowired FinanceQuotationService quotations;
    @Autowired FeatureAccessService access;
    @Autowired FinanceTemplateService templates;
    UUID owner,client;
    @BeforeEach void seed() {
        db.update("UPDATE app_feature_settings SET premium_enforced=true WHERE id=1");
        owner=UUID.randomUUID(); client=UUID.randomUUID(); OWNER.set(owner);
        db.update("INSERT INTO users(id,email,password_hash,plan) VALUES(?,?,?,'PREMIUM')",owner,owner+"@example.test","test");
        db.update("INSERT INTO clients(id,owner_id,name,address,tax_id) VALUES(?,?,'Customer','Bangkok','1234567890123')",client,owner);
    }
    @AfterEach void clearOwner() { OWNER.remove(); }
    @AfterAll static void cleanup(@Autowired JdbcTemplate db) { db.execute("DROP SCHEMA "+SCHEMA+" CASCADE"); }
    FinanceService.Invoice invoice(String amount,String vat) {
        var draft=finance.saveInvoice(null,new FinanceService.InvoiceInput(client,null,DATE,DATE.plusDays(30),vat,"0","",
                List.of(new FinancePolicy.Line("Service","1","job",amount)),null));
        return finance.issueInvoice(draft.id(),draft.version());
    }
    FinanceService.PaymentInput payment(UUID invoice,String amount,String key) {
        return new FinanceService.PaymentInput(invoice,DATE,amount,"0","Bank","ref","",key);
    }
    @Test void invoiceListQueryWorksForEmptyAndPopulatedPages() {
        assertThat(finance.invoices("", "", null, null, 1, 20).items()).isEmpty();
        var issued=invoice("100.00","0");
        var page=finance.invoices("ISSUED",issued.number(),DATE,DATE,1,20);
        assertThat(page.total()).isEqualTo(1);
        assertThat(page.items()).extracting(FinanceService.Invoice::id).containsExactly(issued.id());
    }
    @Test void localFinanceSeedIsCompleteIdempotentAndPreservesEdits() {
        UUID secondClient=UUID.randomUUID();
        db.update("INSERT INTO clients(id,owner_id,name,address,tax_id) VALUES(?,?,'Northstar','Khon Kaen','1234567890124')",secondClient,owner);
        UUID firstProject=UUID.randomUUID(),secondProject=UUID.randomUUID(),thirdProject=UUID.randomUUID();
        db.update("INSERT INTO projects(id,owner_id,client_id,name) VALUES(?,?,?,'Website')",firstProject,owner,client);
        db.update("INSERT INTO projects(id,owner_id,client_id,name) VALUES(?,?,?,'Learning')",secondProject,owner,secondClient);
        db.update("INSERT INTO projects(id,owner_id,client_id,name) VALUES(?,?,?,'Storefront')",thirdProject,owner,client);
        var seed=new LocalFinanceSeedService(db);
        var clients=Map.of("client-01",client,"client-02",secondClient);
        var projects=Map.of("project-01",firstProject,"project-02",secondProject,"project-03",thirdProject);

        var first=seed.seed(owner,clients,projects,DATE);
        assertThat(first.created()).containsEntry("quotation",3).containsEntry("invoice",4)
                .containsEntry("payment",2).containsEntry("transaction",6).containsEntry("finance document",3);
        assertThat(db.queryForObject("SELECT count(*) FROM finance_presets WHERE owner_id=?",Long.class,owner)).isEqualTo(3);
        assertThat(db.queryForObject("SELECT count(*) FROM finance_categories WHERE owner_id=?",Long.class,owner)).isEqualTo(4);
        assertThat(finance.summary().income()).isEqualTo("31500.00");
        assertThat(finance.summary().expenses()).isEqualTo("2140.00");
        assertThat(finance.summary().outstanding()).isEqualTo("11400.00");
        UUID draft=db.queryForObject("SELECT id FROM finance_invoices WHERE owner_id=? AND status='DRAFT'",UUID.class,owner);
        db.update("UPDATE finance_invoices SET note='Keep my local edit' WHERE id=?",draft);

        var second=seed.seed(owner,clients,projects,DATE);
        assertThat(second.existing()).containsEntry("quotation",3).containsEntry("invoice",4)
                .containsEntry("payment",2).containsEntry("transaction",6).containsEntry("finance document",3);
        assertThat(db.queryForObject("SELECT count(*) FROM finance_invoices WHERE owner_id=?",Long.class,owner)).isEqualTo(4);
        assertThat(db.queryForObject("SELECT note FROM finance_invoices WHERE id=?",String.class,draft))
                .isEqualTo("Keep my local edit");
    }
    @Test void lineContractUsesStringsAndSnapshotSurvivesSettingsAndCustomerEdits() {
        var issued=invoice("100.01","0");
        assertThat(issued.lines().get(0).unitPrice()).isEqualTo("100.01");
        assertThat(issued.lines().get(0).amount()).isEqualTo("100.01");
        db.update("UPDATE clients SET name='Changed' WHERE id=?",client);
        db.update("UPDATE finance_settings SET business_name='Changed' WHERE owner_id=?",owner);
        assertThat(finance.invoice(issued.id()).buyerSnapshot()).contains("Customer").doesNotContain("Changed");
        assertThat(finance.invoice(issued.id()).sellerSnapshot()).isEqualTo(issued.sellerSnapshot());
    }
    @Test void concurrentPaymentsCannotOverpayAndRetriesDoNotDuplicateIncome() throws Exception {
        var invoice=invoice("100","0");
        var pool=Executors.newFixedThreadPool(2);
        try {
            Callable<String> first=()->payInThread(invoice.id(),"60","first");
            Callable<String> second=()->payInThread(invoice.id(),"60","second");
            var results=pool.invokeAll(List.of(first,second));
            assertThat(List.of(results.get(0).get(),results.get(1).get())).containsExactlyInAnyOrder("paid","rejected");
            Callable<String> retry=()->payInThread(invoice.id(),"20","retry");
            var retries=pool.invokeAll(List.of(retry,retry));
            assertThat(retries.get(0).get()).isEqualTo("paid"); assertThat(retries.get(1).get()).isEqualTo("paid");
            assertThat(finance.invoice(invoice.id()).paid()).isEqualTo("80.00");
            assertThat(db.queryForObject("SELECT count(*) FROM finance_payments WHERE invoice_id=?",Long.class,invoice.id())).isEqualTo(2);
            assertThatThrownBy(()->finance.recordPayment(payment(invoice.id(),"21","retry"))).isInstanceOf(FinanceException.class);
        } finally { pool.shutdownNow(); }
    }
    String payInThread(UUID invoice,String amount,String key) {
        OWNER.set(owner);
        try { finance.recordPayment(payment(invoice,amount,key)); return "paid"; }
        catch (FinanceException ex) { return "rejected"; }
        finally { OWNER.remove(); }
    }
    @Test void failedReceiptRollsBackPaymentIncomeAndCounter() {
        var invoice=invoice("100","0");
        db.execute("ALTER TABLE finance_documents ADD CONSTRAINT reject_test_receipt CHECK (type <> 'RECEIPT') NOT VALID");
        try {
            assertThatThrownBy(()->finance.recordPayment(payment(invoice.id(),"50","rollback"))).isInstanceOf(RuntimeException.class);
            assertThat(finance.invoice(invoice.id()).paid()).isEqualTo("0.00");
            assertThat(db.queryForObject("SELECT count(*) FROM finance_transactions WHERE owner_id=?",Long.class,owner)).isZero();
            assertThat(db.queryForObject("SELECT count(*) FROM finance_document_counters WHERE owner_id=? AND type='REC'",Long.class,owner)).isZero();
        } finally { db.execute("ALTER TABLE finance_documents DROP CONSTRAINT reject_test_receipt"); }
    }
    @Test void vatInstallmentsStayWithinInvoiceAndCancellationReversesOnlyOnce() {
        var settings=templates.settings();
        templates.saveSettings(new FinanceTemplateService.Settings("Seller","Bangkok","1234567890123","Head office",true,
                "","","#315bd7",null,settings.version()));
        var invoice=invoice("0.32","7");
        java.math.BigDecimal totalVat=java.math.BigDecimal.ZERO;
        for(int i=0;i<4;i++) totalVat=totalVat.add(new java.math.BigDecimal(templates.issueTax(
                new FinanceTemplateService.TaxIssue(invoice.id(),DATE,"0.08","Installment",null)).vatAmount()));
        assertThat(totalVat).isEqualByComparingTo("0.02");
        var paid=finance.recordPayment(payment(invoice.id(),"0.10","cancel"));
        finance.cancelPayment(paid.id(),paid.version(),"Mistake");
        assertThatThrownBy(()->finance.cancelPayment(paid.id(),paid.version(),"Again")).isInstanceOf(FinanceException.class);
        assertThat(finance.invoice(invoice.id()).paid()).isEqualTo("0.00");
    }
    @Test void adminRemainsScopedToOwnFinanceAndFreeIsDenied() {
        var invoice=invoice("100","0"); UUID other=UUID.randomUUID();
        db.update("INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,'ADMIN')",other,other+"@example.test","test");
        OWNER.set(other);
        assertThat(finance.summary().income()).isEqualTo("0.00");
        assertThatThrownBy(()->finance.invoice(invoice.id())).isInstanceOf(FinanceException.class);
        db.update("UPDATE users SET role='USER' WHERE id=?",other);
        assertThatThrownBy(()->finance.summary()).isInstanceOf(FinanceException.class);
    }
    @Test void cancellationAndPaymentSerializeOnTheSameInvoice() throws Exception {
        var invoice=invoice("100","0");
        var pool=Executors.newFixedThreadPool(2);
        var start=new java.util.concurrent.CyclicBarrier(2);
        try {
            Callable<Boolean> cancel=()-> {
                OWNER.set(owner); start.await();
                try { finance.cancelInvoice(invoice.id(),invoice.version(),"Cancelled"); return true; }
                catch(FinanceException ex) { return false; }
                finally { OWNER.remove(); }
            };
            Callable<Boolean> pay=()-> {
                OWNER.set(owner); start.await();
                try { finance.recordPayment(payment(invoice.id(),"10","race-cancel")); return true; }
                catch(FinanceException ex) { return false; }
                finally { OWNER.remove(); }
            };
            var results=pool.invokeAll(List.of(cancel,pay));
            assertThat(results.get(0).get()).isNotEqualTo(results.get(1).get());
            var current=finance.invoice(invoice.id());
            if(current.status().equals("CANCELLED")) assertThat(current.paid()).isEqualTo("0.00");
            else assertThat(current.paid()).isEqualTo("10.00");
        } finally { pool.shutdownNow(); }
    }
    @Test void sameKeyOnDifferentInvoicesReturnsConflictAndNumbersAreUnique() throws Exception {
        var first=invoice("100","0"); var second=invoice("100","0");
        assertThat(first.number()).isNotEqualTo(second.number());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var results=pool.invokeAll(List.of((Callable<String>)()->payInThread(first.id(),"10","shared"),
                    ()->payInThread(second.id(),"10","shared")));
            assertThat(List.of(results.get(0).get(),results.get(1).get())).containsExactlyInAnyOrder("paid","rejected");
        } finally { pool.shutdownNow(); }
    }
    FinanceQuotationService.Quotation quotation() {
        return quotations.save(null,new FinanceQuotationService.QuotationInput(client,null,DATE,DATE.plusDays(30),"0","0.01","Offer",
                List.of(new FinancePolicy.Line("งานออกแบบ","1.005","job","1.00")),null));
    }
    @Test void quotationsHaveIndependentSnapshotsAndDoNotAffectLedger() {
        var draft=quotation();
        assertThat(draft.lines().get(0).amount()).isEqualTo("1.01");
        assertThat(draft.total()).isEqualTo("1.00");
        assertThat(draft.number()).isNull();
        var issued=quotations.issue(draft.id(),draft.version());
        assertThat(issued.number()).startsWith("QT-2026-");
        assertThat(quotations.list("ISSUED","QT-2026",DATE,DATE,1,20).items()).hasSize(1);
        assertThat(finance.summary().outstanding()).isEqualTo("0.00");
        db.update("UPDATE clients SET name='Changed' WHERE id=?",client);
        assertThat(quotations.get(issued.id()).buyerSnapshot()).contains("Customer").doesNotContain("Changed");
        assertThatThrownBy(()->quotations.save(issued.id(),new FinanceQuotationService.QuotationInput(client,null,DATE,DATE,"0","0","",List.of(new FinancePolicy.Line("Changed","1","","1")),issued.version())))
                .isInstanceOf(FinanceException.class);
        var invoice=quotations.invoice(issued.id(),issued.version(),DATE.plusDays(1),DATE.plusDays(31));
        assertThat(invoice.status()).isEqualTo("DRAFT");
        assertThat(invoice.number()).isNull();
        assertThat(invoice.sourceQuotationId()).isEqualTo(issued.id());
        assertThat(invoice.total()).isEqualTo(issued.total());
        assertThat(invoice.sellerSnapshot()).isNull();
        assertThat(quotations.get(issued.id()).invoiceId()).isEqualTo(invoice.id());
        assertThat(finance.issueInvoice(invoice.id(),invoice.version()).buyerSnapshot()).contains("Changed");
        quotations.cancel(issued.id(),issued.version(),"Offer withdrawn");
        assertThat(finance.invoice(invoice.id()).status()).isEqualTo("ISSUED");
        assertThatThrownBy(()->quotations.invoice(issued.id(),issued.version(),DATE,DATE)).isInstanceOf(FinanceException.class);
    }
    @Test void concurrentConversionCreatesOnlyOneInvoiceAndPreservesQuotation() throws Exception {
        var draft=quotation(); var issued=quotations.issue(draft.id(),draft.version());
        var pool=Executors.newFixedThreadPool(2);
        try {
            Callable<UUID> convert=()-> { OWNER.set(owner); try { return quotations.invoice(issued.id(),issued.version(),DATE,DATE.plusDays(30)).id(); } finally { OWNER.remove(); } };
            var results=pool.invokeAll(List.of(convert,convert));
            assertThat(results.get(0).get()).isEqualTo(results.get(1).get());
            assertThat(db.queryForObject("SELECT count(*) FROM finance_invoices WHERE source_quotation_id=?",Long.class,issued.id())).isEqualTo(1);
            assertThat(quotations.get(issued.id()).status()).isEqualTo("ISSUED");
            assertThat(finance.summary().outstanding()).isEqualTo("0.00");
        } finally { pool.shutdownNow(); }
    }
    @Test void failedQuotationIssueAndConversionRollBackAllWrites() {
        var draft=quotation();
        db.execute("ALTER TABLE finance_quotations ADD CONSTRAINT reject_test_issue CHECK (status <> 'ISSUED') NOT VALID");
        try {
            assertThatThrownBy(()->quotations.issue(draft.id(),draft.version())).isInstanceOf(RuntimeException.class);
            assertThat(quotations.get(draft.id()).status()).isEqualTo("DRAFT");
            assertThat(db.queryForObject("SELECT count(*) FROM finance_document_counters WHERE owner_id=? AND type='QT'",Long.class,owner)).isZero();
        } finally { db.execute("ALTER TABLE finance_quotations DROP CONSTRAINT reject_test_issue"); }
        var issued=quotations.issue(draft.id(),draft.version());
        db.execute("ALTER TABLE finance_invoices ADD CONSTRAINT reject_test_link CHECK (source_quotation_id IS NULL) NOT VALID");
        try {
            assertThatThrownBy(()->quotations.invoice(issued.id(),issued.version(),DATE,DATE)).isInstanceOf(RuntimeException.class);
            assertThat(db.queryForObject("SELECT count(*) FROM finance_invoices WHERE owner_id=?",Long.class,owner)).isZero();
            assertThat(quotations.get(issued.id()).invoiceId()).isNull();
        } finally { db.execute("ALTER TABLE finance_invoices DROP CONSTRAINT reject_test_link"); }
    }
    @Test void openAccessPreservesPlansAndStillChecksActiveAccountsAndOwners() {
        db.update("UPDATE users SET plan='FREE' WHERE id=?",owner);
        assertThatThrownBy(()->quotation()).isInstanceOf(FinanceException.class);
        db.update("UPDATE app_feature_settings SET premium_enforced=false WHERE id=1");
        var draft=quotation();
        assertThat(access.features().plan().name()).isEqualTo("FREE");
        UUID other=UUID.randomUUID();
        db.update("INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,'ADMIN')",other,other+"@example.test","test");
        OWNER.set(other);
        assertThat(quotations.list("","",null,null,1,20).items()).isEmpty();
        assertThatThrownBy(()->quotations.get(draft.id())).isInstanceOf(FinanceException.class);
        assertThatThrownBy(()->quotations.issue(draft.id(),0)).isInstanceOf(FinanceException.class);
        assertThatThrownBy(()->quotations.cancel(draft.id(),0,"Other")).isInstanceOf(FinanceException.class);
        assertThatThrownBy(()->quotations.invoice(draft.id(),0,DATE,DATE)).isInstanceOf(FinanceException.class);
        OWNER.set(owner);
        db.update("UPDATE users SET is_active=false WHERE id=?",owner);
        assertThatThrownBy(()->quotations.get(draft.id())).isInstanceOf(FinanceException.class);
        db.update("UPDATE users SET is_active=true,deleted_at=now() WHERE id=?",owner);
        assertThatThrownBy(()->quotations.get(draft.id())).isInstanceOf(FinanceException.class);
        db.update("UPDATE users SET deleted_at=NULL WHERE id=?",owner);
        db.update("UPDATE app_feature_settings SET premium_enforced=true WHERE id=1");
        assertThatThrownBy(()->quotations.get(draft.id())).isInstanceOf(FinanceException.class);
        db.update("UPDATE app_feature_settings SET premium_enforced=false WHERE id=1");
        assertThat(quotations.get(draft.id()).id()).isEqualTo(draft.id());
    }
    @Test void upgradesV23WithExistingInvoiceAndKeepsLaterSwitchChoice() {
        String schema="finance_v23_"+UUID.randomUUID().toString().replace("-", "");
        var source=new DriverManagerDataSource(System.getenv("FINANCE_TEST_DATABASE_URL"),
                System.getenv("FINANCE_TEST_DATABASE_USER"),System.getenv("FINANCE_TEST_DATABASE_PASSWORD"));
        try {
            Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").target("23").load().migrate();
            var properties=new java.util.Properties(); properties.setProperty("currentSchema",schema); source.setConnectionProperties(properties);
            var jdbc=new JdbcTemplate(source);
            UUID user=UUID.randomUUID(), customer=UUID.randomUUID(), invoice=UUID.randomUUID();
            jdbc.update("INSERT INTO users(id,email,password_hash,plan) VALUES(?,?,?,'PREMIUM')",user,user+"@example.test","test");
            jdbc.update("INSERT INTO clients(id,owner_id,name) VALUES(?,?,'Existing customer')",customer,user);
            jdbc.update("INSERT INTO finance_invoices(id,owner_id,client_id,number,status,issue_date,due_date,subtotal,total,seller_snapshot) VALUES(?,?,?,'INV-2026-00001','ISSUED',?,?,100.01,100.01,'{\"business_name\":\"Original\"}'::jsonb)",invoice,user,customer,DATE,DATE);
            var flyway=Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load();
            flyway.migrate(); flyway.validate();
            assertThat(jdbc.queryForObject("SELECT total FROM finance_invoices WHERE id=?",java.math.BigDecimal.class,invoice)).isEqualByComparingTo("100.01");
            assertThat(jdbc.queryForObject("SELECT seller_snapshot::text FROM finance_invoices WHERE id=?",String.class,invoice)).contains("Original");
            assertThat(jdbc.queryForObject("SELECT source_quotation_id FROM finance_invoices WHERE id=?",UUID.class,invoice)).isNull();
            assertThat(jdbc.queryForObject("SELECT plan FROM users WHERE id=?",String.class,user)).isEqualTo("PREMIUM");
            assertThat(jdbc.queryForObject("SELECT premium_enforced FROM app_feature_settings",Boolean.class)).isFalse();
            jdbc.update("UPDATE app_feature_settings SET premium_enforced=true,version=1 WHERE id=1");
            flyway.migrate();
            assertThat(jdbc.queryForObject("SELECT premium_enforced FROM app_feature_settings",Boolean.class)).isTrue();
        } finally { new JdbcTemplate(source).execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
    }
    @Test void upgradesExistingAccountsWithoutChangingTheirRole() {
        String schema="finance_upgrade_"+UUID.randomUUID().toString().replace("-", "");
        var source=new DriverManagerDataSource(System.getenv("FINANCE_TEST_DATABASE_URL"),
                System.getenv("FINANCE_TEST_DATABASE_USER"),System.getenv("FINANCE_TEST_DATABASE_PASSWORD"));
        var legacy=Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
                .locations("classpath:db/migration").target("21").load();
        try {
            legacy.migrate();
            var properties=new java.util.Properties(); properties.setProperty("currentSchema",schema); source.setConnectionProperties(properties);
            var jdbc=new JdbcTemplate(source); UUID existing=UUID.randomUUID();
            jdbc.update("INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,'ADMIN')",existing,existing+"@example.test","test");
            Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load().migrate();
            assertThat(jdbc.queryForObject("SELECT plan FROM users WHERE id=?",String.class,existing)).isEqualTo("FREE");
            assertThat(jdbc.queryForObject("SELECT role FROM users WHERE id=?",String.class,existing)).isEqualTo("ADMIN");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM finance_transactions",Long.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT premium_enforced FROM app_feature_settings WHERE id=1",Boolean.class)).isFalse();
            Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load().validate();
        } finally { new JdbcTemplate(source).execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
    }
}
