import { readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { listNotValidConstraints, validateCleanConstraints } from "@/core/runtime/infra/not-valid-constraints"

import { disconnectDatabase, prisma } from "../helpers/database"

/**
 * Kế hoạch GĐ1 "dọn khoá NOT VALID" (VAN_HANH_CAP_NHAT_CSDL.md §7): migration thử VALIDATE từng khoá, khoá còn dòng
 * sai giữ NOT VALID mà không làm hỏng deploy; `db:not-valid` đếm dòng sai và VALIDATE khoá đã sạch.
 * Bảng tạm riêng của ca thử (không thuộc sổ tenant), xoá ở cuối.
 */
const MIGRATION = readFileSync(
  path.join(process.cwd(), "prisma/migrations/20261111090000_validate_not_valid_constraints/migration.sql"),
  "utf8",
)
const runMigrationBlock = () => prisma.$executeRawUnsafe(MIGRATION.match(/DO \$\$[\s\S]*?END \$\$;/)![0])
const ours = async () => (await listNotValidConstraints()).filter((c) => c.table.startsWith("zz_nv_"))

describe("dọn khoá NOT VALID", () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS zz_nv_child, zz_nv_parent`)
    await prisma.$executeRawUnsafe(`CREATE TABLE zz_nv_parent (id text, org text, PRIMARY KEY (id, org))`)
    await prisma.$executeRawUnsafe(`CREATE TABLE zz_nv_child (id text PRIMARY KEY, parent_id text NOT NULL, org text, status text)`)
    await prisma.$executeRawUnsafe(`INSERT INTO zz_nv_parent VALUES ('p1', 'o1')`)
    await prisma.$executeRawUnsafe(`INSERT INTO zz_nv_child VALUES ('ok', 'p1', 'o1', 'ACTIVE'), ('lech-to-chuc', 'p1', 'o2', 'ACTIVE'),
      ('khong-kiem', 'p9', NULL, 'ACTIVE'), ('la', 'p1', 'o1', 'LA')`)
    await prisma.$executeRawUnsafe(`ALTER TABLE zz_nv_child ADD CONSTRAINT zz_nv_child_parent_fkey FOREIGN KEY (parent_id, org) REFERENCES zz_nv_parent (id, org) NOT VALID`)
    await prisma.$executeRawUnsafe(`ALTER TABLE zz_nv_child ADD CONSTRAINT zz_nv_child_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')) NOT VALID`)
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS zz_nv_child, zz_nv_parent`)
    await disconnectDatabase()
  })

  it("đếm dòng vi phạm: khoá ghép theo MATCH SIMPLE (cột NULL không kiểm), CHECK theo biểu thức", async () => {
    expect(await ours()).toEqual([
      { table: "zz_nv_child", name: "zz_nv_child_parent_fkey", kind: "FOREIGN KEY", violations: 1 },
      { table: "zz_nv_child", name: "zz_nv_child_status_check", kind: "CHECK", violations: 1 },
    ])
  })

  it("migration: còn dòng sai thì giữ NOT VALID, không lỗi, không xoá dòng; dọn xong thì VALIDATE", async () => {
    await runMigrationBlock()
    expect((await ours()).map((c) => c.name)).toEqual(["zz_nv_child_parent_fkey", "zz_nv_child_status_check"])
    expect(await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM zz_nv_child`)).toEqual([{ n: 4 }])

    await prisma.$executeRawUnsafe(`UPDATE zz_nv_child SET status = 'INACTIVE' WHERE id = 'la'`)
    await runMigrationBlock()
    expect((await ours()).map((c) => c.name)).toEqual(["zz_nv_child_parent_fkey"])
  })

  it("--validate chỉ VALIDATE khoá đã sạch", async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM zz_nv_child WHERE id = 'lech-to-chuc'`)
    expect(await validateCleanConstraints()).toEqual(["zz_nv_child_parent_fkey"])
    expect((await ours()).map((c) => c.name)).toEqual(["zz_nv_child_status_check"])
  })
})
