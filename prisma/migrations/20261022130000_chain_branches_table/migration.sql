-- Chi nhánh điều phối chuỗi (rà soát M5, PO duyệt 22/10/2026): tách khỏi
-- `organizations.settings.chain_branches` sang bảng riêng. Viết tay để chép dữ liệu cũ:
-- mỗi phần tử JSON có `branchId` + `branchName` thành một dòng; trùng mã thì giữ phần tử
-- cuối mảng (đúng thứ tự ghi đè của bulk-import cũ). Trường sai kiểu → dùng mặc định.
-- Phần tử thiếu mã hoặc tên bị bỏ: code cũ cũng không dùng được chúng.
BEGIN;
-- CreateTable
CREATE TABLE "chain_branches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "active_jobs_count" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent_jobs" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "channels" JSONB,
    "cancellation_count" INTEGER NOT NULL DEFAULT 0,
    "bypass_count" INTEGER NOT NULL DEFAULT 0,
    "cancellation_history" JSONB,
    "bypass_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chain_branches_organization_id_idx" ON "chain_branches"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "chain_branches_organization_id_branch_code_key" ON "chain_branches"("organization_id", "branch_code");

-- AddForeignKey
ALTER TABLE "chain_branches" ADD CONSTRAINT "chain_branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Chép dữ liệu cũ
CREATE FUNCTION pg_temp.num(v jsonb) RETURNS double precision LANGUAGE sql IMMUTABLE AS
  $$ SELECT CASE WHEN jsonb_typeof(v) = 'number' THEN (v #>> '{}')::double precision END $$;
CREATE FUNCTION pg_temp.txt(v jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS
  $$ SELECT CASE WHEN jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') <> '' THEN v #>> '{}' END $$;

INSERT INTO "chain_branches" (
    "id", "organization_id", "branch_code", "name", "address", "latitude", "longitude",
    "quality_score", "active_jobs_count", "max_concurrent_jobs", "is_active", "channels",
    "cancellation_count", "bypass_count", "cancellation_history", "bypass_history", "updated_at"
)
SELECT DISTINCT ON (o.id, pg_temp.txt(e.value -> 'branchId'))
    gen_random_uuid()::text,
    o.id,
    pg_temp.txt(e.value -> 'branchId'),
    pg_temp.txt(e.value -> 'branchName'),
    pg_temp.txt(e.value -> 'address'),
    COALESCE(pg_temp.num(e.value #> '{location,latitude}'), pg_temp.num(e.value -> 'latitude')),
    COALESCE(pg_temp.num(e.value #> '{location,longitude}'), pg_temp.num(e.value -> 'longitude')),
    COALESCE(pg_temp.num(e.value -> 'qualityScore'), 90),
    COALESCE(trunc(pg_temp.num(e.value -> 'activeJobsCount'))::int, 0),
    COALESCE(trunc(pg_temp.num(e.value -> 'maxConcurrentJobs'))::int, 5),
    CASE WHEN jsonb_typeof(e.value -> 'isActive') = 'boolean' THEN (e.value ->> 'isActive')::boolean ELSE true END,
    -- Bản cũ có thể để kênh ở cấp ngoài (phone, telegramChatId, zaloPhone); `channels` thắng khi trùng.
    NULLIF(
        jsonb_strip_nulls(jsonb_build_object(
            'phone', pg_temp.txt(e.value -> 'phone'),
            'telegramChatId', pg_temp.txt(e.value -> 'telegramChatId'),
            'zaloPhone', pg_temp.txt(e.value -> 'zaloPhone')))
        || CASE WHEN jsonb_typeof(e.value -> 'channels') = 'object' THEN e.value -> 'channels' ELSE '{}'::jsonb END,
        '{}'::jsonb),
    COALESCE(trunc(pg_temp.num(e.value -> 'cancellationCount'))::int, 0),
    COALESCE(trunc(pg_temp.num(e.value -> 'bypassCount'))::int, 0),
    CASE WHEN jsonb_typeof(e.value -> 'cancellationHistory') = 'array' THEN e.value -> 'cancellationHistory' END,
    CASE WHEN jsonb_typeof(e.value -> 'bypassHistory') = 'array' THEN e.value -> 'bypassHistory' END,
    CURRENT_TIMESTAMP
FROM "organizations" o
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(o."settings" -> 'chain_branches') = 'array' THEN o."settings" -> 'chain_branches' ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(value, ord)
WHERE jsonb_typeof(e.value) = 'object'
  AND pg_temp.txt(e.value -> 'branchId') IS NOT NULL
  AND pg_temp.txt(e.value -> 'branchName') IS NOT NULL
ORDER BY o.id, pg_temp.txt(e.value -> 'branchId'), e.ord DESC;

UPDATE "organizations" SET "settings" = "settings" - 'chain_branches'
WHERE jsonb_typeof("settings") = 'object' AND "settings" ? 'chain_branches';

COMMIT;
