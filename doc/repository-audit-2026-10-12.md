# Repository audit

What this repo does: FreelanceFlow manages a user's clients, projects, tasks and work timer, with JWT sessions and a Next.js API proxy. The current change adds account administration, Premium entitlements and a PostgreSQL Finance ledger. This audit assumes multiple users, concurrent requests and several hundred invoices per owner; it is not a capacity benchmark.

Mapped the Backend entry point, security configuration, auth/account mappers, current-owner boundary, Finance controllers/services/queries, migrations, Docker configuration, Frontend routes/proxy, navigation, timer provider and connected tests/docs. Went deepest on money, ownership and transactional writes. The detailed findings and fixes are in [the change review](finance-review-2026-10-12.md).

## Must fix

1. **Money and lifecycle boundaries had correctness bugs** (`FinancePolicy`, `FinanceService`, `FinanceTemplateService`)
   - **What this is:** The ledger connects invoices, payments, income and document history.
   - **Problem:** The reviewed working tree had a response mismatch, cancellation races, VAT allocation overflow and weak retry checks.
   - **Fix:** The change review findings 1–5 describe the implemented fixes and regression checks.
   - **If we skip it:** Owners can see incorrect balances or fail to print a saved invoice.

## Should fix

2. **Finish the document/template scope before claiming full acceptance** (`Settings`, `FinanceTemplateService`)
   - **What this is:** The original Finance plan includes business document details and complete template management.
   - **Problem:** Buyer branch capture, receipt replacement, template editing in the UI and paginated template lists remain incomplete.
   - **Fix:** Complete change review finding 12 with explicit contracts and migration/tests.
   - **If we skip it:** Documentation and release claims can overstate what users can actually do.

3. **Keep database tests enabled in the validation environment** (`FinancePostgresIntegrationTest`)
   - **What this is:** Ordinary unit/HTTP tests use H2; the Finance integration suite uses a disposable PostgreSQL schema.
   - **Problem:** Without `FINANCE_TEST_DATABASE_URL`, PostgreSQL tests skip. H2 cannot prove PostgreSQL row locks, JSONB or rollback/counter semantics.
   - **Fix:** Supply dedicated test database credentials during acceptance/CI runs and retain the explicit skip in environments without PostgreSQL.
   - **If we skip it:** A green default test suite alone does not verify real financial write concurrency.

Verdict: Review fixes improve the financial boundaries. Finish the scope gaps and use PostgreSQL acceptance checks before releasing the entire Finance plan.

Not checked: Every historical project/task/report implementation, production infrastructure, dependency vulnerability databases, tax filing certification, and high-load benchmarks. No deployment or push was performed.
