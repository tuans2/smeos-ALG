#!/usr/bin/env node
// Cập nhật CSDL lúc deploy bằng `prisma migrate deploy` — thay `db push --accept-data-loss`
// (rà soát 21/10/2026, giai đoạn 3). Chạy: npm run db:deploy
//
// Lần đầu trên một CSDL đang chạy bằng `db push`, script tự đánh dấu migration nền là đã áp,
// nhưng CHỈ khi CSDL khớp đúng `schema.prisma`. Lệch là dừng build, không sửa gì.
// Quy trình đầy đủ: docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md
import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

import pg from "pg"

import { BASELINE_MIGRATION, planDeploy } from "./db-deploy-plan.mjs"

if (existsSync(".env")) process.loadEnvFile(".env")

const url = process.env.DATABASE_URL
if (!url) {
  console.error("db-deploy: thiếu DATABASE_URL")
  process.exit(1)
}

function prisma(args) {
  return spawnSync("npx", ["prisma", ...args], { stdio: "inherit", env: process.env })
}

function fail(message) {
  console.error(`db-deploy: ${message}`)
  process.exit(1)
}

async function readState(client) {
  const tables = await client.query(
    `SELECT to_regclass('public.organizations') IS NOT NULL AS app,
            to_regclass('public._prisma_migrations') IS NOT NULL AS history`
  )
  const { app, history } = tables.rows[0]
  let baselineApplied = false
  if (history) {
    const row = await client.query(
      `SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      [BASELINE_MIGRATION]
    )
    baselineApplied = row.rowCount > 0
  }
  return { hasAppTables: app, hasMigrationsTable: history, baselineApplied }
}

/** Đổi tên bảng lịch sử thời floraos (không xoá) để `migrate deploy` bắt đầu sổ mới. */
async function archiveHistory(client) {
  const name = `_prisma_migrations_pre_baseline_${Date.now()}`
  await client.query(`ALTER TABLE "_prisma_migrations" RENAME TO "${name}"`)
  console.log(`db-deploy: đã cất lịch sử migration cũ vào bảng ${name}`)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
let steps
try {
  steps = planDeploy(await readState(client))
  console.log(`db-deploy: các bước ${steps.join(" → ")}`)

  if (steps.includes("check-drift")) {
    const drift = prisma([
      "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code",
    ])
    if (drift.status === 2) {
      fail(
        "CSDL đang lệch schema.prisma (chi tiết ở trên). Không tự đánh dấu migration nền. " +
          "Làm theo mục \"CSDL lệch\" trong docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md."
      )
    }
    if (drift.status !== 0) fail("không so được CSDL với schema.prisma")
  }
  if (steps.includes("archive-history")) await archiveHistory(client)
} finally {
  await client.end()
}

if (steps.includes("resolve-baseline")) {
  if (prisma(["migrate", "resolve", "--applied", BASELINE_MIGRATION]).status !== 0) {
    fail("không đánh dấu được migration nền")
  }
}
if (prisma(["migrate", "deploy"]).status !== 0) fail("prisma migrate deploy thất bại")
