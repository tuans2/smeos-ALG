import { describe, expect, it } from "vitest"

import { checkMigrationSql, checkMigrationsDir } from "../../../scripts/check-migrations.mjs"

/** Quy ước expand/contract cho migration mới (ADR-015 D-O4, bước O-5). */
describe("check-migrations", () => {
  it("migration hiện có trong repo đạt quy ước", () => {
    expect(checkMigrationsDir().filter((r: { errors: string[] }) => r.errors.length > 0)).toEqual([])
  })

  it("chặn DROP COLUMN không có dòng contract", () => {
    expect(checkMigrationSql('ALTER TABLE "a" DROP COLUMN "b";').errors).toHaveLength(1)
    expect(checkMigrationSql('-- contract: cột b đã ngừng đọc từ PR #1\nALTER TABLE "a" DROP COLUMN "b";').errors).toEqual([])
  })

  it("chặn đổi kiểu cột không USING", () => {
    expect(checkMigrationSql('ALTER TABLE "a" ALTER COLUMN "b" SET DATA TYPE INTEGER;').errors).toHaveLength(1)
    expect(checkMigrationSql('ALTER TABLE "a" ALTER COLUMN "b" SET DATA TYPE INTEGER USING "b"::integer;').errors).toEqual([])
  })

  it("cột tên \"type\" không bị hiểu là đổi kiểu (ADR-012 T-8b)", () => {
    expect(checkMigrationSql('ALTER TABLE "o" ALTER COLUMN "type" DROP DEFAULT;').errors).toEqual([])
    expect(checkMigrationSql('ALTER TABLE "o" ALTER COLUMN "type" SET DEFAULT \'SINGLE\';').errors).toEqual([])
    expect(checkMigrationSql('ALTER TABLE "o" ALTER COLUMN "type" TYPE "t2";').errors).toHaveLength(1)
  })

  it("chặn thêm cột NOT NULL không DEFAULT", () => {
    expect(checkMigrationSql('ALTER TABLE "a" ADD COLUMN "b" TEXT NOT NULL;').errors).toHaveLength(1)
    expect(checkMigrationSql('ALTER TABLE "a" ADD COLUMN "b" TEXT NOT NULL DEFAULT \'x\';').errors).toEqual([])
  })

  it("SET NOT NULL cần backfill", () => {
    expect(checkMigrationSql('ALTER TABLE "a" ALTER COLUMN "b" SET NOT NULL;').errors).toHaveLength(1)
    expect(checkMigrationSql('UPDATE "a" SET "b" = 1 WHERE "b" IS NULL;\nALTER TABLE "a" ALTER COLUMN "b" SET NOT NULL;').errors).toEqual([])
  })

  it("lệnh trong chú thích không bị tính; thiếu lock_timeout chỉ là cảnh báo", () => {
    const r = checkMigrationSql('-- ALTER TABLE "a" DROP COLUMN "b";\nCREATE INDEX "i" ON "a"("c");')
    expect(r.errors).toEqual([])
    expect(r.warnings).toHaveLength(1)
  })
})
