CREATE TABLE finance_quotations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id),
 client_id UUID NOT NULL, project_id UUID, number VARCHAR(50),
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','CANCELLED')),
 issue_date DATE NOT NULL, valid_until DATE NOT NULL CHECK (valid_until >= issue_date),
 vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_rate BETWEEN 0 AND 100),
 discount NUMERIC(17,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
 subtotal NUMERIC(17,2) NOT NULL, vat NUMERIC(17,2) NOT NULL, total NUMERIC(17,2) NOT NULL CHECK (total > 0),
 seller_snapshot JSONB, buyer_snapshot JSONB, brand_snapshot JSONB, note TEXT NOT NULL DEFAULT '',
 cancel_reason TEXT, version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (client_id, owner_id) REFERENCES clients(id, owner_id),
 FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id),
 UNIQUE (id, owner_id), UNIQUE (owner_id, number)
);
CREATE INDEX idx_finance_quotations_owner_date ON finance_quotations(owner_id, issue_date DESC);
CREATE TABLE finance_quotation_lines (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id UUID NOT NULL REFERENCES finance_quotations(id),
 position INT NOT NULL, description TEXT NOT NULL, quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
 unit VARCHAR(40) NOT NULL, unit_price NUMERIC(17,2) NOT NULL CHECK (unit_price >= 0), amount NUMERIC(17,2) NOT NULL,
 UNIQUE (quotation_id, position)
);
ALTER TABLE finance_invoices ADD COLUMN source_quotation_id UUID;
ALTER TABLE finance_invoices ADD CONSTRAINT fk_invoice_quotation_owner
 FOREIGN KEY (source_quotation_id, owner_id) REFERENCES finance_quotations(id, owner_id);
ALTER TABLE finance_invoices ADD CONSTRAINT uq_invoice_source_quotation UNIQUE (source_quotation_id);
