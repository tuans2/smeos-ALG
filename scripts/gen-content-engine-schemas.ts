/**
 * gen-content-engine-schemas.ts — sinh JSON Schema của Content Engine (P27)
 * từ hợp đồng zod (`src/modules/content-engine/contracts/`).
 *
 *   npm run gen:schemas:content-engine     ghi lại thư mục schema
 *   npm run check:schemas:content-engine   chỉ kiểm, thoát 1 nếu tệp cũ/thừa/thiếu
 *
 * Nguồn chuẩn là zod — không sửa tay tệp `.json`.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

import {
  CONTENT_ENGINE_SCHEMA_DIR,
  buildContentEngineSchemaFiles,
  serializeSchemaFile,
} from "../src/modules/content-engine/contracts/json-schema"

const check = process.argv.includes("--check")
const dir = path.resolve(__dirname, "..", CONTENT_ENGINE_SCHEMA_DIR)
const files = buildContentEngineSchemaFiles()
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
    console.error(`[schemas:content-engine] LỆCH mã — cũ/thiếu: ${stale.join(", ") || "không"}; thừa: ${extra.join(", ") || "không"}`)
    console.error("Chạy `npm run gen:schemas:content-engine` rồi commit cùng thay đổi zod.")
    process.exit(1)
  }
  console.log(`[schemas:content-engine] khớp — ${files.length} tệp.`)
} else {
  console.log(`[schemas:content-engine] ghi ${stale.length}/${files.length} tệp vào ${CONTENT_ENGINE_SCHEMA_DIR}.`)
  if (extra.length) console.warn(`[schemas:content-engine] tệp thừa (xoá tay nếu không dùng): ${extra.join(", ")}`)
}
