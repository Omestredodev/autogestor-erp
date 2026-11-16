-- PEÇA-AQUI | V001 | PostgreSQL 17 | UTF-8
-- Projeto acadêmico: modelo físico inicial baseado nas etapas 6 a 10.
-- Executado apenas na criação de um volume novo pelo Docker.
BEGIN;
CREATE SCHEMA IF NOT EXISTS peca_aqui;
SET search_path TO peca_aqui, public;

CREATE TABLE profiles (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name VARCHAR(60) NOT NULL UNIQUE,
 active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE permissions (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 code VARCHAR(100) NOT NULL UNIQUE,
 description TEXT NOT NULL
);
CREATE TABLE profile_permissions (
 profile_id BIGINT NOT NULL REFERENCES profiles(id),
 permission_id BIGINT NOT NULL REFERENCES permissions(id),
 allowed BOOLEAN NOT NULL DEFAULT TRUE,
 PRIMARY KEY (profile_id, permission_id)
);
CREATE TABLE users (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 profile_id BIGINT NOT NULL REFERENCES profiles(id),
 name VARCHAR(150) NOT NULL,
 email VARCHAR(200) NOT NULL UNIQUE,
 password_hash TEXT,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE brands (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name VARCHAR(120) NOT NULL UNIQUE,
 active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE categories (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name VARCHAR(120) NOT NULL UNIQUE,
 active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE units (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 symbol VARCHAR(15) NOT NULL UNIQUE,
 description VARCHAR(100) NOT NULL
);
CREATE TABLE products (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 internal_code VARCHAR(60) NOT NULL UNIQUE,
 manufacturer_code VARCHAR(80),
 ean VARCHAR(30),
 oem_code VARCHAR(80),
 description TEXT NOT NULL CHECK(length(btrim(description)) > 0),
 brand_id BIGINT NOT NULL REFERENCES brands(id),
 category_id BIGINT NOT NULL REFERENCES categories(id),
 unit_id BIGINT NOT NULL REFERENCES units(id),
 current_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(current_cost >= 0),
 manual_margin NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK(manual_margin >= 0 AND manual_margin < 1),
 standard_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(standard_price >= 0),
 min_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
 max_stock NUMERIC(14,3) CHECK(max_stock IS NULL OR max_stock >= min_stock),
 stock_location VARCHAR(80),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_products_ean ON products(ean) WHERE ean IS NOT NULL AND ean <> '';
CREATE INDEX ix_products_description ON products USING gin(to_tsvector('portuguese', description));
CREATE INDEX ix_products_manufacturer ON products(manufacturer_code);
CREATE TABLE product_price_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id),
 changed_by BIGINT REFERENCES users(id),
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 old_cost NUMERIC(14,2), new_cost NUMERIC(14,2),
 old_margin NUMERIC(7,4), new_margin NUMERIC(7,4),
 old_price NUMERIC(14,2), new_price NUMERIC(14,2)
);
CREATE TABLE vehicles (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 manufacturer VARCHAR(100) NOT NULL,
 model VARCHAR(100) NOT NULL,
 year_start INTEGER NOT NULL CHECK(year_start BETWEEN 1950 AND 2200),
 year_end INTEGER NOT NULL CHECK(year_end BETWEEN 1950 AND 2200),
 engine VARCHAR(100) NOT NULL DEFAULT '',
 version VARCHAR(100) NOT NULL DEFAULT '',
 vehicle_type VARCHAR(40) NOT NULL DEFAULT 'AUTOMOVEL',
 notes TEXT,
 CHECK(year_end >= year_start),
 UNIQUE(manufacturer, model, year_start, year_end, engine, version)
);
CREATE TABLE product_applications (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id),
 vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
 notes TEXT,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE(product_id, vehicle_id)
);
CREATE TABLE product_equivalences (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_a_id BIGINT NOT NULL REFERENCES products(id),
 product_b_id BIGINT NOT NULL REFERENCES products(id),
 notes TEXT,
 created_by BIGINT NOT NULL REFERENCES users(id),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(product_a_id < product_b_id),
 UNIQUE(product_a_id, product_b_id)
);
CREATE TABLE customers (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name VARCHAR(180) NOT NULL,
 document VARCHAR(20) UNIQUE,
 phone VARCHAR(35), email VARCHAR(200), address TEXT,
 payment_terms VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE'
     CHECK(payment_terms IN ('IMMEDIATE','WEEKLY','BIWEEKLY','MONTHLY','OTHER')),
 credit_limit NUMERIC(14,2) CHECK(credit_limit IS NULL OR credit_limit >= 0),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE suppliers (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name VARCHAR(180) NOT NULL,
 document VARCHAR(20) UNIQUE,
 phone VARCHAR(35), email VARCHAR(200), address TEXT,
 active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE purchases (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
 created_by BIGINT NOT NULL REFERENCES users(id),
 document_number VARCHAR(100),
 purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
 status VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED')),
 idempotency_key VARCHAR(100) UNIQUE,
 confirmed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE purchase_items (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 purchase_id BIGINT NOT NULL REFERENCES purchases(id),
 product_id BIGINT NOT NULL REFERENCES products(id),
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity > 0),
 unit_cost NUMERIC(14,2) NOT NULL CHECK(unit_cost >= 0),
 UNIQUE(purchase_id, product_id)
);
CREATE TABLE stock_balances (
 product_id BIGINT PRIMARY KEY REFERENCES products(id),
 quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(quantity >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sales (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_number VARCHAR(50) GENERATED ALWAYS AS ('VEN-' || lpad(id::TEXT,8,'0')) STORED,
 customer_id BIGINT REFERENCES customers(id),
 customer_label VARCHAR(160) NOT NULL DEFAULT 'AO CONSUMIDOR',
 seller_id BIGINT NOT NULL REFERENCES users(id),
 notes TEXT,
 payment_terms VARCHAR(12) NOT NULL DEFAULT 'IMMEDIATE'
      CHECK(payment_terms IN ('IMMEDIATE','DEFERRED')),
 status VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED','CANCELLED')),
 idempotency_key VARCHAR(100) UNIQUE,
 confirmed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(payment_terms <> 'DEFERRED' OR customer_id IS NOT NULL),
 CHECK(customer_id IS NULL OR customer_label <> 'AO CONSUMIDOR')
);
CREATE UNIQUE INDEX ux_sales_sale_number ON sales(sale_number);
CREATE INDEX ix_sales_date ON sales(created_at DESC);
CREATE INDEX ix_sales_customer_status ON sales(customer_id, status, created_at DESC);
CREATE TABLE sale_items (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id BIGINT NOT NULL REFERENCES sales(id),
 product_id BIGINT NOT NULL REFERENCES products(id),
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity > 0),
 practiced_price NUMERIC(14,2) NOT NULL CHECK(practiced_price >= 0),
 code_snapshot VARCHAR(60),
 description_snapshot TEXT,
 cost_snapshot NUMERIC(14,2),
 reference_price_snapshot NUMERIC(14,2),
 UNIQUE(sale_id, product_id)
);
CREATE TABLE sale_cancellations (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id BIGINT NOT NULL UNIQUE REFERENCES sales(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL CHECK(length(btrim(reason)) >= 3),
 cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE returns (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id BIGINT NOT NULL REFERENCES sales(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL CHECK(length(btrim(reason)) >= 3),
 status VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CONFIRMED')),
 confirmed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE return_items (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 return_id BIGINT NOT NULL REFERENCES returns(id),
 sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity > 0),
 UNIQUE(return_id, sale_item_id)
);
CREATE TABLE stock_movements (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 kind VARCHAR(25) NOT NULL CHECK(kind IN
 ('PURCHASE_IN','SALE_OUT','RETURN_IN','CANCELLATION_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT')),
 delta NUMERIC(14,3) NOT NULL CHECK(delta <> 0),
 purchase_item_id BIGINT REFERENCES purchase_items(id),
 sale_item_id BIGINT REFERENCES sale_items(id),
 return_item_id BIGINT REFERENCES return_items(id),
 cancellation_id BIGINT REFERENCES sale_cancellations(id),
 reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (
    (kind = 'PURCHASE_IN' AND delta > 0 AND purchase_item_id IS NOT NULL
      AND sale_item_id IS NULL AND return_item_id IS NULL AND cancellation_id IS NULL)
 OR (kind = 'SALE_OUT' AND delta < 0 AND sale_item_id IS NOT NULL
      AND purchase_item_id IS NULL AND return_item_id IS NULL AND cancellation_id IS NULL)
 OR (kind = 'RETURN_IN' AND delta > 0 AND return_item_id IS NOT NULL
      AND purchase_item_id IS NULL AND sale_item_id IS NULL AND cancellation_id IS NULL)
 OR (kind = 'CANCELLATION_IN' AND delta > 0 AND cancellation_id IS NOT NULL AND sale_item_id IS NOT NULL
      AND purchase_item_id IS NULL AND return_item_id IS NULL)
 OR (kind IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT')
      AND ((kind = 'ADJUSTMENT_IN' AND delta > 0) OR (kind = 'ADJUSTMENT_OUT' AND delta < 0))
      AND purchase_item_id IS NULL AND sale_item_id IS NULL AND return_item_id IS NULL AND cancellation_id IS NULL
      AND reason IS NOT NULL AND length(btrim(reason)) >= 3)
 )
);
CREATE UNIQUE INDEX ux_movement_purchase_item ON stock_movements(purchase_item_id) WHERE kind='PURCHASE_IN';
CREATE UNIQUE INDEX ux_movement_sale_item ON stock_movements(sale_item_id) WHERE kind='SALE_OUT';
CREATE UNIQUE INDEX ux_movement_return_item ON stock_movements(return_item_id) WHERE kind='RETURN_IN';
CREATE UNIQUE INDEX ux_movement_cancellation_item ON stock_movements(cancellation_id, sale_item_id) WHERE kind='CANCELLATION_IN';
CREATE INDEX ix_movements_product_date ON stock_movements(product_id, created_at DESC);
CREATE TABLE closings (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 customer_id BIGINT NOT NULL REFERENCES customers(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(period_end >= period_start)
);
CREATE TABLE closing_items (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 closing_id BIGINT NOT NULL REFERENCES closings(id),
 sale_id BIGINT NOT NULL UNIQUE REFERENCES sales(id),
 amount_considered NUMERIC(14,2) NOT NULL CHECK(amount_considered >= 0)
);
CREATE TABLE payments (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id BIGINT REFERENCES sales(id),
 closing_id BIGINT REFERENCES closings(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 amount NUMERIC(14,2) NOT NULL CHECK(amount > 0),
 method VARCHAR(30) NOT NULL CHECK(method IN ('CASH','PIX','CARD','TRANSFER','OTHER')),
 paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 status VARCHAR(15) NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED','REVERSED')),
 reversal_reason TEXT,
 idempotency_key VARCHAR(100) UNIQUE,
 CHECK((sale_id IS NOT NULL) <> (closing_id IS NOT NULL))
);
CREATE INDEX ix_payments_sale ON payments(sale_id) WHERE status='CONFIRMED';
CREATE INDEX ix_payments_closing ON payments(closing_id) WHERE status='CONFIRMED';
CREATE TABLE refunds (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sale_id BIGINT NOT NULL REFERENCES sales(id),
 actor_id BIGINT NOT NULL REFERENCES users(id),
 amount NUMERIC(14,2) NOT NULL CHECK(amount > 0),
 status VARCHAR(15) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','CANCELLED')),
 reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 paid_at TIMESTAMPTZ
);
CREATE TABLE reminders (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 created_by BIGINT NOT NULL REFERENCES users(id),
 title VARCHAR(160) NOT NULL,
 description TEXT,
 scheduled_for TIMESTAMPTZ NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
   CHECK(status IN ('PENDING','SNOOZED','DONE','CANCELLED')),
 customer_id BIGINT REFERENCES customers(id),
 product_id BIGINT REFERENCES products(id),
 sale_id BIGINT REFERENCES sales(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 resolved_at TIMESTAMPTZ
);
CREATE INDEX ix_reminders_due ON reminders(scheduled_for) WHERE status IN ('PENDING','SNOOZED');
CREATE TABLE reminder_recipients (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reminder_id BIGINT NOT NULL REFERENCES reminders(id),
 user_id BIGINT NOT NULL REFERENCES users(id),
 notified_at TIMESTAMPTZ,
 read_at TIMESTAMPTZ,
 UNIQUE(reminder_id,user_id)
);
CREATE TABLE audit_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id BIGINT REFERENCES users(id),
 entity VARCHAR(100) NOT NULL,
 record_id TEXT,
 action VARCHAR(30) NOT NULL,
 old_value JSONB,
 new_value JSONB,
 happened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_lookup ON audit_events(entity, record_id, happened_at DESC);
COMMIT;
