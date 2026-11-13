/**
 * gen-coordinator-schemas.ts — sinh JSON Schema input/output của 7 bước
 * Coordinator Operations từ hợp đồng zod (`src/modules/coordinator/contracts/`).
 *
 *   npm run gen:schemas:coordinator          ghi lại thư mục schema
 *   npm run check:schemas:coordinator        chỉ kiểm, thoát 1 nếu tệp cũ/thừa/thiếu
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

import {
  COORDINATOR_SCHEMA_DIR,
  buildCoordinatorSchemaFiles,
  serializeSchemaFile,
} from "../src/modules/coordinator/contracts/json-schema"

const check = process.argv.includes("--check")
const dir = path.resolve(__dirname, "..", COORDINATOR_SCHEMA_DIR)
const files = buildCoordinatorSchemaFiles()
const wanted = new Set(files.map((f) => f.file))

const stale: string[] = []
if (!check) mkdirSync(dir, { recursive: true })
for (const f of files) {
  const target = path.join(dir, f.file)
  const text = serializeSchemaFile(f)
  const current = existsSync(target) ? readFileSync(target, "utf8") : null
  if (current === text) continue
  stale.push(f.file)
  if (!check) writeFileSync(target, text)
}
const extra = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".json") && !wanted.has(n)) : []

if (check) {
  if (stale.length || extra.length) {
    console.error(`[schemas:coordinator] LỆCH mã — cũ/thiếu: ${stale.join(", ") || "không"}; thừa: ${extra.join(", ") || "không"}`)
    console.error("Chạy `npm run gen:schemas:coordinator` rồi commit cùng thay đổi zod.")
    process.exit(1)
  }
  console.log(`[schemas:coordinator] khớp — ${files.length} tệp.`)
} else {
  console.log(`[schemas:coordinator] ghi ${stale.length}/${files.length} tệp vào ${COORDINATOR_SCHEMA_DIR}.`)
  if (extra.length) console.warn(`[schemas:coordinator] tệp thừa (xoá tay nếu không dùng): ${extra.join(", ")}`)
}
