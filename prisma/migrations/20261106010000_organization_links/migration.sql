-- ADR-012 D-T3, bước T-2: bảng quan hệ giữa các tổ chức `organization_links` (đồ thị cha → con, một cạnh
-- chính ACTIVE mỗi tổ chức con). Giai đoạn chuyển: chép từ `chain_partnerships` (giữ nguyên id), repository
-- đối tác ghi kép, đường đọc vẫn ở `chain_partnerships` cho tới T-3.
-- Bảng mới + chép dữ liệu; không sửa, không xoá dữ liệu cũ.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "organization_link_type" AS ENUM ('SUBCONTRACTOR', 'FRANCHISE', 'INDUSTRY_MEMBER', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "organization_link_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateTable
CREATE TABLE "organization_links" (
    "id" TEXT NOT NULL,
    "parent_org_id" TEXT NOT NULL,
    "child_org_id" TEXT NOT NULL,
    "link_type" "organization_link_type" NOT NULL DEFAULT 'SUBCONTRACTOR',
    "status" "organization_link_status" NOT NULL DEFAULT 'ACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(3),
    "partner_code" TEXT NOT NULL,
    "capacity_daily" INTEGER NOT NULL DEFAULT 10,
    "commission_rate" DECIMAL(65,30),
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "address" TEXT,
    "province" TEXT,
    "district" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_links_parent_org_id_status_idx" ON "organization_links"("parent_org_id", "status");

-- CreateIndex
CREATE INDEX "organization_links_child_org_id_status_idx" ON "organization_links"("child_org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_links_parent_org_id_child_org_id_key" ON "organization_links"("parent_org_id", "child_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_links_parent_org_id_partner_code_key" ON "organization_links"("parent_org_id", "partner_code");

-- AddForeignKey
ALTER TABLE "organization_links" ADD CONSTRAINT "organization_links_parent_org_id_fkey" FOREIGN KEY ("parent_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_links" ADD CONSTRAINT "organization_links_child_org_id_fkey" FOREIGN KEY ("child_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Một tổ chức không là cha của chính nó.
ALTER TABLE "organization_links" ADD CONSTRAINT "organization_links_not_self_check" CHECK ("parent_org_id" <> "child_org_id");

-- Chép từ chain_partnerships. `partnership_type` = BRANCH (nghĩa thứ tư của "chi nhánh", ADR-012 D-T2) không còn
-- giá trị tương ứng: chép thành SUBCONTRACTOR và báo NOTICE để rà tay.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "chain_partnerships" WHERE "partnership_type" NOT IN ('SUBCONTRACTOR', 'FRANCHISE');
  IF n > 0 THEN
    RAISE NOTICE 'organization_links: % liên kết có partnership_type khác SUBCONTRACTOR/FRANCHISE, chép thành SUBCONTRACTOR — rà tay', n;
  END IF;
END $$;

INSERT INTO "organization_links" (
  "id", "parent_org_id", "child_org_id", "link_type", "status", "is_primary", "valid_from", "valid_to",
  "partner_code", "capacity_daily", "commission_rate", "contact_name", "contact_phone", "contact_email",
  "address", "province", "district", "created_at", "updated_at")
SELECT p."id", p."chain_org_id", p."partner_org_id",
       (CASE WHEN p."partnership_type" = 'FRANCHISE' THEN 'FRANCHISE' ELSE 'SUBCONTRACTOR' END)::"organization_link_type",
       p."status"::"organization_link_status", false, p."created_at",
       CASE WHEN p."status" = 'TERMINATED' THEN p."updated_at" END,
       p."partner_code", p."capacity_daily", p."commission_rate", p."contact_name", p."contact_phone", p."contact_email",
       p."address", p."province", p."district", p."created_at", p."updated_at"
  FROM "chain_partnerships" p;

-- Cạnh chính = liên kết ACTIVE sớm nhất của mỗi tổ chức con — đúng luật đang dùng (ADR-012 T-1).
UPDATE "organization_links" l SET "is_primary" = true
  FROM (SELECT DISTINCT ON ("child_org_id") "id" FROM "organization_links"
         WHERE "status" = 'ACTIVE' ORDER BY "child_org_id", "created_at", "id") first_active
 WHERE l."id" = first_active."id";

-- Tối đa một cạnh chính ACTIVE mỗi tổ chức con. Prisma không khai được index riêng phần nên giữ bằng trigger
-- ràng buộc (chạy cuối giao dịch, cho phép bỏ cạnh cũ rồi đặt cạnh mới trong cùng giao dịch).
CREATE OR REPLACE FUNCTION smeos_organization_links_one_primary() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM "organization_links"
       WHERE "child_org_id" = NEW."child_org_id" AND "is_primary" AND "status" = 'ACTIVE') > 1 THEN
    RAISE EXCEPTION 'organization_links: tổ chức % có nhiều hơn một cạnh chính ACTIVE', NEW."child_org_id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "organization_links_one_primary"
  AFTER INSERT OR UPDATE ON "organization_links"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION smeos_organization_links_one_primary();

COMMIT;
