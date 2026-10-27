# Review of the uncommitted Admin and Finance change

What this change does: It adds an account-only Admin dashboard and separates account role from Free/Premium access. It replaces temporary Finance balances with an owner-scoped PostgreSQL ledger, invoices, payments, document snapshots and service presets. This review assumes several users and browser tabs can write at once, with hundreds of invoices per owner.

The user explicitly requested review, tests, refactoring and commits. The audit/review skills normally produce reports only; the explicit request authorizes the fixes below.

## Must fix — fixed in this change

1. **Invoice preview received JSON numbers instead of decimal strings** (`FinanceService.Invoice`, `FinanceInvoiceQuery`)
   - **What this is:** The UI reads monetary values with exact integer arithmetic.
   - **Problem:** Invoice lines returned Java decimal numbers. Calling the UI string parser on those numbers crashed document preview.
   - **Fix:** Keep decimals in the calculation policy and return a dedicated string-valued line response. The PostgreSQL regression checks the returned line values; browser coverage opens the preview.
   - **If we skip it:** Saving an invoice works, but opening its preview can crash.

2. **Cancelling invoices could race with accepting payment** (`FinanceService.cancelInvoice`, `cancelPayment`, `FinanceTemplateService.cancelDocument`)
   - **What this is:** Several commands change an invoice and its related ledger/documents.
   - **Problem:** Cancellation counted active records without acquiring the lock used by payment writes. A payment could commit after the cancellation check.
   - **Fix:** Use the same invoice row lock for lifecycle writes. Add a simultaneous cancellation/payment regression with real transaction proxies.
   - **If we skip it:** A cancelled invoice can retain active income and receipts.

3. **Small VAT installments could exceed the invoice VAT** (`FinancePolicy.allocateVat`)
   - **What this is:** Each installment rounds VAT to two decimals.
   - **Problem:** For a 0.32 base at 7%, four installments of 0.08 could allocate three cents before the final installment, although total VAT is two cents.
   - **Fix:** Cap each allocation at remaining VAT, and allocate the residual to the final installment. Unit and PostgreSQL tests cover this example.
   - **If we skip it:** The final installment can fail with negative VAT or earlier documents can overstate tax.

4. **Retries could silently reuse a key with a different payment** (`FinanceService.recordPayment`)
   - **What this is:** An idempotency key makes retries return one payment.
   - **Problem:** The original code compared only the invoice, and concurrent requests using one key for different invoices could hit a database uniqueness error.
   - **Fix:** Serialize by owner/key, then lock the invoice. Compare date, amounts, method, reference and certificate; changed payloads return 409. Add concurrent same-key and different-invoice tests.
   - **If we skip it:** A retry can report success for the wrong amount or return a server error.

5. **Financial values could exceed database precision** (`FinancePolicy.calculate`, `FinanceTemplateService.savePreset`)
   - **What this is:** The database supports money with 15 integral/two fractional digits and quantity with 12 integral/three fractional digits.
   - **Problem:** Accepted quantity, line multiplication or summed totals could exceed these bounds and fail during persistence.
   - **Fix:** Bound decimal syntax and check line/subtotal/total precision. Presets reuse the same policy. Reject invalid inputs before writing.
   - **If we skip it:** Valid-looking forms produce a 500 instead of a useful validation error.

6. **Older invoices and receipts became inaccessible in the UI** (`InvoicePicker`, `Payments`)
   - **What this is:** Payment and tax invoice forms choose an owned invoice.
   - **Problem:** Choices and receipt buttons were based on only the newest 100 records.
   - **Fix:** Add searchable, paginated invoice choices and a receipt endpoint keyed by Payment. Keep the chosen invoice across searches.
   - **If we skip it:** Owners with more than 100 records cannot finish older invoices or print their receipts.

7. **The first-Admin command started web configuration in a non-web process** (`AdminPromotionCommand`)
   - **What this is:** An operator promotes an existing active account once.
   - **Problem:** Starting the full application with no web context could still import web security beans that require HTTP security configuration.
   - **Fix:** Start a separate configuration with database auto-configuration and no component scan. Promotion still uses the existing datasource configuration and never runs on normal startup.
   - **If we skip it:** Operators can fail before the promotion query runs.

## Should fix — fixed in this change

8. **Invoice pages made extra queries for every row** (`FinanceInvoiceQuery`)
   - **What this is:** A list page includes invoice lines and totals.
   - **Problem:** A 100-row page previously made roughly 200 detail queries after fetching IDs.
   - **Fix:** Load headers and lines in two batch queries, preserving the page order and owner predicate.
   - **If we skip it:** Database round trips grow with each row and slow down busy owners.

9. **Document numbering was duplicated** (`FinanceDocumentNumbers`)
   - **What this is:** Invoices, receipts and tax invoices allocate an owner/type/year number.
   - **Problem:** Two copies of the same SQL could change independently.
   - **Fix:** Use one repository with a mandatory caller transaction. The rollback regression verifies failed receipts leave no payment, income or counter increment.
   - **If we skip it:** Future fixes can leave document types following different numbering rules.

10. **Browser tests still expected temporary sample data** (`e2e/workspace.spec.ts`)
   - **What this is:** The Finance browser acceptance test checks invoice/payment flows.
   - **Problem:** It expected sample inputs, demo buttons and reset-on-reload behavior that no longer exist.
   - **Fix:** Test real client selection, draft preview, issuance, partial payment, reload persistence and Premium revocation. Extend the Free gate check to settings and tax invoices.
   - **If we skip it:** The test either skips the feature or tests the opposite persistence rule.

11. **Preview keyboard and print behavior was incomplete** (`DocumentPrint`)
   - **What this is:** One renderer serves preview and print.
   - **Problem:** A plain overlay had no focus trap or Escape handler. Hiding page content by visibility retained its layout during print.
   - **Fix:** Use the existing Radix dialog dependency with a body portal and hide other body elements with display during print. Include bank instructions, due date, notes and bilingual document titles.
   - **If we skip it:** Keyboard users lose focus and printed output can include blank space from the workspace layout.

## Remaining scope gaps

12. **Document and template requirements are not all complete** (`FinanceTemplateService`, `Settings`, `DocumentPrint`)
   - **What this is:** The earlier plan also requested buyer branch capture, receipt replacement, editable presets/categories and pagination/search for all lists.
   - **Problem:** These are not all present. Tax invoice replacement works, but receipt replacement and buyer branch capture do not. Template lists remain unpaginated and their UI currently supports creation/deletion.
   - **Fix:** Implement these as a reviewed follow-up before declaring the entire original Finance plan complete. Preserve issued snapshots and add the next migration instead of rewriting applied V23.
   - **If we skip it:** The shipped feature remains narrower than the approved Finance plan, especially for business tax documents.

Verdict: The corrected implementation can be committed for review. Do not declare the full Finance plan complete while finding 12 remains.

Not checked: Full tax compliance certification, external deployment, every historical workspace path, and load beyond the assumed owner/page sizes. Test results for this checkout are recorded separately in `test/finance-review-results.md`.
