-- ADR-014 D-P2, bước P-3a (expand): `order_recipients` — người nhận và bên mua hoá đơn VAT của một đơn, nơi lưu dữ liệu
-- cá nhân của đơn. PO duyệt 07/11/2026: P-3 chia ba bước (P-3a bảng + backfill + ghi kép; P-3b chuyển đọc; P-3c bỏ dữ
-- liệu cá nhân khỏi `orders.delivery_address` và các cột `orders.vat_*`), gồm cả VAT. Ở bước này nơi cũ vẫn ghi và vẫn
-- được đọc. Bảng thuộc tổ chức: RLS như mọi bảng tenant (sinh bởi scripts/gen-rls-policies.mjs); khoá ghép
-- (order_id, organization_id) tới `orders`. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateTable
CREATE TABLE "order_recipients" (
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "recipient_name" TEXT,
    "recipient_phone" TEXT,
    "address_line" TEXT,
    "address_parts" JSONB,
    "vat_company_name" TEXT,
    "vat_tax_code" TEXT,
    "vat_company_address" TEXT,
    "vat_email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_recipients_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE INDEX "order_recipients_organization_id_idx" ON "order_recipients"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_recipients_order_id_organization_id_key" ON "order_recipients"("order_id", "organization_id");

-- AddForeignKey
ALTER TABLE "order_recipients" ADD CONSTRAINT "order_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_recipients" ADD CONSTRAINT "order_recipients_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2) — sinh bởi scripts/gen-rls-policies.mjs
ALTER TABLE "order_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_recipients" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_recipients"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  );

-- P3A-BACKFILL-BEGIN (test `order-recipients.test.ts` chạy lại đúng khối này, so với `recipientFromDeliveryAddress`)
-- Chuỗi của một khoá JSON: chỉ khi là chuỗi, bỏ khoảng trắng hai đầu, rỗng → NULL.
CREATE FUNCTION pg_temp.p3a_str(j jsonb, k text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(j -> k) = 'string' THEN NULLIF(btrim(j ->> k, E' \t\r\n'), '') END
$$;

INSERT INTO "order_recipients" ("organization_id", "order_id", "recipient_name", "recipient_phone", "address_line",
  "address_parts", "vat_company_name", "vat_tax_code", "vat_company_address", "vat_email", "updated_at")
SELECT x.organization_id, x.id, x.recipient_name, x.recipient_phone, x.address_line, x.address_parts,
       x.vat_company_name, x.vat_tax_code, x.vat_company_address, x.vat_email, now()
FROM (
  SELECT o."organization_id", o."id",
    CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3a_str(a, 'recipientName'), pg_temp.p3a_str(a, 'name')) END AS recipient_name,
    CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3a_str(a, 'phone'), pg_temp.p3a_str(a, 'recipientPhone')) END AS recipient_phone,
    CASE
      WHEN jsonb_typeof(a) = 'string' THEN NULLIF(btrim(a #>> '{}', E' \t\r\n'), '')
      WHEN jsonb_typeof(a) = 'object' THEN COALESCE(
        pg_temp.p3a_str(a, 'street'), pg_temp.p3a_str(a, 'full_address'), pg_temp.p3a_str(a, 'fullAddress'), pg_temp.p3a_str(a, 'address'),
        CASE WHEN jsonb_typeof(a -> 'parts') = 'object' THEN NULLIF(concat_ws(', ',
          NULLIF(concat_ws(' ', pg_temp.p3a_str(a -> 'parts', 'houseNumber'), pg_temp.p3a_str(a -> 'parts', 'street')), ''),
          pg_temp.p3a_str(a -> 'parts', 'ward'), pg_temp.p3a_str(a -> 'parts', 'district'), pg_temp.p3a_str(a -> 'parts', 'province')), '') END)
    END AS address_line,
    CASE
      WHEN jsonb_typeof(a) <> 'object' THEN NULL
      WHEN jsonb_typeof(a -> 'parts') = 'object' THEN a -> 'parts'
      ELSE NULLIF(jsonb_strip_nulls(jsonb_build_object('ward', pg_temp.p3a_str(a, 'ward'), 'district', pg_temp.p3a_str(a, 'district'),
        'province', pg_temp.p3a_str(a, 'province'))), '{}'::jsonb)
    END AS address_parts,
    o."vat_company_name", o."vat_tax_code", o."vat_company_address", o."vat_email"
  FROM "orders" o, LATERAL (SELECT o."delivery_address" AS a) d
) x
WHERE COALESCE(x.recipient_name, x.recipient_phone, x.address_line, x.address_parts::text,
               x.vat_company_name, x.vat_tax_code, x.vat_company_address, x.vat_email) IS NOT NULL
ON CONFLICT ("order_id") DO NOTHING;

DROP FUNCTION pg_temp.p3a_str(jsonb, text);
-- P3A-BACKFILL-END

COMMIT;
