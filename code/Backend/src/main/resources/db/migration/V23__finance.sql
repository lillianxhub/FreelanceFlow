-- Owner-scoped finance ledger and immutable document history. No seed balances.
CREATE TABLE finance_settings (
 owner_id UUID PRIMARY KEY REFERENCES users(id), business_name TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
 tax_id VARCHAR(30) NOT NULL DEFAULT '', branch VARCHAR(100) NOT NULL DEFAULT '', vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
 bank_details TEXT NOT NULL DEFAULT '', footer TEXT NOT NULL DEFAULT '', brand_color VARCHAR(7) NOT NULL DEFAULT '#315bd7',
 logo_asset_id UUID, version BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE finance_assets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id),
 content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image/png','image/jpeg')),
 content BYTEA NOT NULL CHECK (octet_length(content) <= 1048576), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (id, owner_id)
);
ALTER TABLE finance_settings ADD CONSTRAINT fk_finance_logo FOREIGN KEY (logo_asset_id, owner_id) REFERENCES finance_assets(id, owner_id);
CREATE TABLE finance_categories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
 name VARCHAR(100) NOT NULL, version BIGINT NOT NULL DEFAULT 0, UNIQUE (id, owner_id), UNIQUE (owner_id, kind, name)
);
CREATE TABLE finance_presets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), name VARCHAR(120) NOT NULL,
 description TEXT NOT NULL, quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0), unit VARCHAR(40) NOT NULL,
 unit_price NUMERIC(17,2) NOT NULL CHECK (unit_price >= 0), suggested_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (suggested_vat_rate BETWEEN 0 AND 100),
 version BIGINT NOT NULL DEFAULT 0, UNIQUE (id, owner_id)
);
CREATE TABLE finance_invoices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id),
 client_id UUID NOT NULL, project_id UUID, number VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','CANCELLED')),
 issue_date DATE NOT NULL, due_date DATE NOT NULL, vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_rate BETWEEN 0 AND 100),
 discount NUMERIC(17,2) NOT NULL DEFAULT 0 CHECK (discount >= 0), subtotal NUMERIC(17,2) NOT NULL DEFAULT 0,
 vat NUMERIC(17,2) NOT NULL DEFAULT 0, total NUMERIC(17,2) NOT NULL DEFAULT 0,
 seller_snapshot JSONB, buyer_snapshot JSONB, brand_snapshot JSONB, note TEXT NOT NULL DEFAULT '',
 cancel_reason TEXT, version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (client_id, owner_id) REFERENCES clients(id, owner_id), FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id),
 CHECK (due_date >= issue_date), UNIQUE (id, owner_id), UNIQUE (owner_id, number)
);
CREATE INDEX idx_finance_invoices_owner_date ON finance_invoices(owner_id, issue_date DESC);
CREATE TABLE finance_invoice_lines (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES finance_invoices(id),
 position INT NOT NULL, description TEXT NOT NULL, quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
 unit VARCHAR(40) NOT NULL, unit_price NUMERIC(17,2) NOT NULL CHECK (unit_price >= 0), amount NUMERIC(17,2) NOT NULL,
 UNIQUE (invoice_id, position)
);
CREATE TABLE finance_transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
 occurred_on DATE NOT NULL, description TEXT NOT NULL, category VARCHAR(100) NOT NULL DEFAULT '', project_id UUID,
 amount NUMERIC(17,2) NOT NULL CHECK (amount > 0), payment_id UUID, cancelled_at TIMESTAMPTZ, cancel_reason TEXT,
 version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id), UNIQUE (id, owner_id)
);
CREATE INDEX idx_finance_transactions_owner_date ON finance_transactions(owner_id, occurred_on DESC);
CREATE TABLE finance_payments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), invoice_id UUID NOT NULL,
 paid_on DATE NOT NULL, received NUMERIC(17,2) NOT NULL CHECK (received >= 0), withheld NUMERIC(17,2) NOT NULL DEFAULT 0 CHECK (withheld >= 0),
 method VARCHAR(50) NOT NULL DEFAULT '', reference VARCHAR(150) NOT NULL DEFAULT '', withholding_certificate VARCHAR(150) NOT NULL DEFAULT '',
 idempotency_key VARCHAR(120) NOT NULL, cancelled_at TIMESTAMPTZ, cancel_reason TEXT,
 version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (invoice_id, owner_id) REFERENCES finance_invoices(id, owner_id), UNIQUE (id, owner_id), UNIQUE (owner_id, idempotency_key),
 CHECK (received + withheld > 0)
);
ALTER TABLE finance_transactions ADD CONSTRAINT fk_finance_transaction_payment FOREIGN KEY (payment_id, owner_id) REFERENCES finance_payments(id, owner_id);
CREATE TABLE finance_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), invoice_id UUID NOT NULL,
 payment_id UUID, type VARCHAR(20) NOT NULL CHECK (type IN ('RECEIPT','TAX_INVOICE')),
 number VARCHAR(50) NOT NULL, issued_on DATE NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','CANCELLED')),
 base_amount NUMERIC(17,2) NOT NULL CHECK (base_amount >= 0), vat_amount NUMERIC(17,2) NOT NULL CHECK (vat_amount >= 0),
 description TEXT NOT NULL DEFAULT '', seller_snapshot JSONB NOT NULL, buyer_snapshot JSONB NOT NULL, brand_snapshot JSONB NOT NULL,
 replaces_id UUID REFERENCES finance_documents(id), cancelled_at TIMESTAMPTZ, cancel_reason TEXT,
 version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (invoice_id, owner_id) REFERENCES finance_invoices(id, owner_id),
 FOREIGN KEY (payment_id, owner_id) REFERENCES finance_payments(id, owner_id), UNIQUE (id, owner_id), UNIQUE (owner_id, type, number)
);
CREATE INDEX idx_finance_documents_owner_invoice ON finance_documents(owner_id, invoice_id);
CREATE TABLE finance_document_counters (
 owner_id UUID NOT NULL REFERENCES users(id), type VARCHAR(20) NOT NULL, year INT NOT NULL,
 next_value INT NOT NULL CHECK (next_value > 0), PRIMARY KEY(owner_id,type,year)
);
