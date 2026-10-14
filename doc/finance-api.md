# Finance API and document templates

All endpoints use the existing `ApiResult` envelope at `/api/finance`. A bearer session is required. The Backend checks the active account and persisted Premium policy on every Finance request and scopes every query to the current owner. Enforcement is off by default, so Free accounts can use Finance. When an Admin enables enforcement, only `ADMIN` or `PREMIUM` accounts are allowed; denied access returns `403` and existing records remain stored. `401` means authentication is missing, `404` means a resource is not visible to this owner, `400` means an invalid input or lifecycle action, and `409` means a stale version. Money is a **decimal string** in THB with two fractional digits. Quantity allows three digits. Dates use `YYYY-MM-DD`.

| Endpoint | Purpose |
| --- | --- |
| `GET /summary` | Cash income, cash expenses, net, outstanding, invoice VAT and withheld tax |
| `GET /transactions?kind=&search=&from=&to=&page=1&limit=20` | Paginated ledger; cancelled items stay visible |
| `POST /transactions`, `PUT /transactions/{id}` | Save independent cash movement; update requires `version` |
| `POST /transactions/{id}/cancel` | Cancel with `{version,reason}`; payment income cannot be edited here |
| `GET /invoices?status=&search=&page=1&limit=20`, `GET /invoices/{id}` | Invoice list and detail |
| `POST /invoices`, `PUT /invoices/{id}` | Save draft; required owned `clientId`, optional matching `projectId`, dates, `lines`, `discount`, `vatRate` |
| `POST /invoices/{id}/issue`, `POST /invoices/{id}/cancel` | Issue with `{version}`; cancel with `{version,reason}` after payments and active documents are cancelled |
| `GET /payments?invoiceId=&page=1&limit=20`, `POST /payments` | Record received cash and withheld tax; `idempotencyKey` required |
| `GET /documents/receipt/{paymentId}` | Retrieve the receipt directly, including cancelled receipts |
| `POST /payments/{id}/cancel` | Cancel payment and its income/receipt once, with `{version,reason}` |
| `GET /settings`, `PUT /settings` | Business identity, VAT registration, brand, bank and footer; update requires `version` |
| `POST /assets/logo`, `GET /assets/{id}` | Owner-scoped PNG/JPEG logo, maximum 1 MB |
| `GET/POST /presets`, `PUT/DELETE /presets/{id}` | Reusable service lines; update/delete require `version` |
| `GET/POST /categories`, `PUT/DELETE /categories/{id}` | Income/expense category management |
| `GET /documents?invoiceId=&type=&status=&from=&to=&page=1&limit=20`, `GET /documents/{id}` | Paginated receipt and tax invoice snapshots |
| `POST /tax-invoices`, `POST /documents/{id}/cancel` | Issue tax invoice from `{invoiceId,date,baseAmount,description,replacesId?}` or cancel with `{version,reason}` |

Invoice line price excludes VAT. Backend rounds each line to two digits with `HALF_UP`, subtracts the fixed discount and calculates VAT on the net amount. VAT defaults to zero. A nonzero VAT rate requires VAT-registered business details. Issuing assigns a unique owner/type/year number and snapshots business, customer and brand data. A payment is serialized by an invoice row lock; cash received plus withheld tax reduces its balance, while only cash received enters Income. The same transaction creates its ledger entry and receipt. An identical repeated idempotency key returns the original payment. Reusing it with different payment details returns `409`; the owner/key lock also protects concurrent requests for different invoices. Tax invoices can cover multiple installments, but active taxable bases cannot exceed the invoice net amount; each installment is capped at the remaining VAT and the final installment receives the residual. Cancelled documents remain in history. A replacement references a cancelled document and receives a new number.

The UI uses browser print/Save PDF from a shared A4 preview. No e-mail delivery, payment gateway, refund, credit note, or issue of a withholding certificate to a supplier is included. The `withholdingCertificate` field records a certificate received from a customer. The runtime Swagger switch stays controlled by existing `OPENAPI_ENABLED`; rebuild the Backend image after changing code, then inspect `/v3/api-docs` when enabled. Check that `/api/finance/summary` returns `401` without authentication rather than `404` to confirm the running image contains this API.


Invoice line `quantity`, `unitPrice` and `amount` are JSON strings, not numbers. Quantity has at most 12 integral and three fractional digits. Each money value, line amount, subtotal and total must fit `NUMERIC(17,2)`; overflow and excess precision return `400`. Lifecycle commands for payments, invoices and documents use the same invoice lock. Document number allocation uses the caller transaction and rolls back with a failed document write.

The renderer includes the document identity, business/customer details, separate VAT, bank instructions and cancellation/Draft markings. These fields follow the [Revenue Department VAT document requirements](https://www.rd.go.th/5208.html); the received certificate field relates to [section 50 bis](https://www.rd.go.th/5937.html). This implementation has not been certified as a tax filing or electronic tax invoice system. Buyer branch capture and receipt replacement are not implemented in this version; tax invoice replacements are supported.

## Quotations and conversion (V25)

| Endpoint | Purpose |
| --- | --- |
| `GET /quotations?status=&search=&from=&to=&page=1&limit=20` | Owner-scoped list with the usual pagination meta; search number/client name, filter issue dates |
| `GET /quotations/{id}` | Quotation including lines, snapshots and linked `invoiceId` |
| `POST /quotations`, `PUT /quotations/{id}` | Save draft using `clientId`, optional matching `projectId`, `issueDate`, `validUntil`, `lines`, `discount`, `vatRate`, `note`; updates require `version` |
| `POST /quotations/{id}/issue` | `{version}`; assign `QT-YYYY-NNNNN` and capture seller, buyer and brand snapshots |
| `POST /quotations/{id}/cancel` | `{version,reason}`; retain document and cancellation history |
| `POST /quotations/{id}/invoice` | `{version,issueDate,dueDate}`; create and return one editable Invoice draft, or return its existing linked invoice on retry |

Quotation states are `DRAFT`, `ISSUED`, `CANCELLED`. Only drafts are editable. Valid-until cannot precede issue date; its UI default is issue date plus 30 days. Validity is printed and no automatic acceptance/expiry state is introduced. Issuance uses the same monetary and VAT identity validation as invoices. Quotations have separate headers/lines and do not enter income, VAT summaries, or outstanding balances.

Conversion requires an issued, non-cancelled quotation. It copies client, project, line items, discount, VAT and note; invoice dates are selected separately. The source quotation remains issued and immutable. A quotation row lock serializes conversion/cancellation, and a unique owner-safe `source_quotation_id` link prevents duplicate invoices. Draft creation, line insertion and linkage are one transaction. Once linked, retries open the existing invoice rather than overwrite its dates or edits. Invoice snapshots are captured independently on its own issuance. Cancelling a quotation does not cancel its linked invoice.

## Unsaved document previews

The Quotation/Invoice editor opens Preview from the current form without saving or allocating a number. Examples are visibly marked `EXAMPLE / DRAFT`; saved drafts are marked `DRAFT`. A blank field shows a placeholder. Invalid/overflowing numeric inputs show an explanation and unavailable totals rather than fabricated zero amounts. The browser uses scaled integers for the same line-first HALF_UP rounding as FinancePolicy; the Backend remains authoritative at save time.

Draft previews load current business/client identity. Issued and cancelled document previews use stored snapshots. The same A4 renderer handles on-screen preview and browser Print/Save PDF, including Thai text, repeating table headers, multiple pages, and retained draft/cancellation markings. Closing Preview preserves local form edits and restores keyboard focus.
