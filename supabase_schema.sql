-- Supabase用スキーマ定義
-- server.jsのinitDb()関数から抽出
-- CREATE EXTENSION行は削除（Supabaseでは既に有効）

-- frames（ordersより先に作成）
CREATE TABLE IF NOT EXISTS frames (
  id text primary key,
  display_name text not null,
  category text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- sellers
CREATE TABLE IF NOT EXISTS sellers (
  id text primary key,
  display_name text not null,
  shop_name text,
  stripe_account_id text,
  email text,
  password_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  order_no integer not null,
  amount integer not null,
  cost_amount integer default 0,
  -- 🌍 世界相場（参考）※ eBay US / UK のうち高い方を事前計算して保存
  world_price_median integer,
  world_price_high integer,
  world_price_low integer,
  world_price_sample_count integer default 0,
  world_price_revenue_max integer,
  world_price_profit_max integer,
  summary text,
  frame_id text,
  status text not null default 'pending',
  stripe_sid text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint orders_frame_fk
    foreign key (frame_id) references frames(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_seller_orderno_unique
  ON orders(seller_id, order_no);

CREATE INDEX IF NOT EXISTS orders_seller_status_idx
  ON orders(seller_id, status);

CREATE INDEX IF NOT EXISTS orders_created_idx
  ON orders(created_at desc);

-- stripe_payments
CREATE TABLE IF NOT EXISTS stripe_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  order_id uuid,
  payment_intent_id text not null,
  charge_id text,
  balance_tx_id text,
  amount_gross integer not null,
  amount_fee integer,
  amount_net integer,
  currency text not null default 'jpy',
  status text not null,
  refunded_total integer not null default 0,
  dispute_status text,
  raw_event jsonb,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS stripe_payments_seller_idx
  ON stripe_payments(seller_id);

CREATE INDEX IF NOT EXISTS stripe_payments_order_idx
  ON stripe_payments(order_id);

CREATE INDEX IF NOT EXISTS stripe_payments_status_idx
  ON stripe_payments(status);

CREATE INDEX IF NOT EXISTS stripe_payments_pi_idx
  ON stripe_payments(payment_intent_id);

-- UNIQUE制約
CREATE UNIQUE INDEX IF NOT EXISTS stripe_payments_pi_unique
  ON stripe_payments(payment_intent_id);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  name text not null,
  unit_price integer not null,
  quantity integer not null,
  amount integer not null,
  source text not null default 'ai',
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON order_items(order_id);

-- images
CREATE TABLE IF NOT EXISTS images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  kind text not null default 'processed',
  url text not null,
  s3_key text,
  content_type text,
  file_size integer,
  created_at timestamptz default now(),
  constraint images_kind_processed_only check (kind = 'processed')
);

CREATE INDEX IF NOT EXISTS images_order_idx
  ON images(order_id);

-- qr_sessions
CREATE TABLE IF NOT EXISTS qr_sessions (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  order_id uuid references orders(id) on delete cascade,
  scanned_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS qr_sessions_seller_idx
  ON qr_sessions(seller_id);

-- buyer_attributes
CREATE TABLE IF NOT EXISTS buyer_attributes (
  order_id uuid primary key references orders(id) on delete cascade,
  customer_type text not null,
  gender text not null,
  age_band text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint buyer_attributes_customer_type_check 
    check (customer_type in ('domestic', 'inbound')),
  constraint buyer_attributes_gender_check 
    check (gender in ('male', 'female', 'unknown')),
  constraint buyer_attributes_age_band_check 
    check (age_band in ('child', 'age_16_29', 'age_30_59', 'age_60_plus'))
);

CREATE INDEX IF NOT EXISTS buyer_attributes_customer_type_idx
  ON buyer_attributes(customer_type);

-- order_metadata
CREATE TABLE IF NOT EXISTS order_metadata (
  order_id uuid primary key references orders(id) on delete cascade,
  category text,
  buyer_language text,
  is_cash boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS order_metadata_order_idx
  ON order_metadata(order_id);

CREATE INDEX IF NOT EXISTS order_metadata_is_cash_idx
  ON order_metadata(is_cash);

-- kids_achievements
CREATE TABLE IF NOT EXISTS kids_achievements (
  seller_id text not null,
  code text not null,
  kind text not null,
  first_earned_at timestamptz default now(),
  primary key (seller_id, code),
  constraint kids_achievements_kind_check
    check (kind in ('badge', 'title'))
);

CREATE INDEX IF NOT EXISTS kids_achievements_seller_idx
  ON kids_achievements(seller_id);

