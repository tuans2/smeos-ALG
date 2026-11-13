/**
 * gen-creative-studio-schemas.ts — sinh JSON Schema input/output của 14 chặng
 * Creative Studio từ hợp đồng zod (`src/modules/creative-production/contracts/`).
 *
 *   npm run gen:schemas:creative          ghi lại thư mục schema
 *   npm run check:schemas:creative        chỉ kiểm, thoát 1 nếu tệp cũ/thừa/thiếu
 *
 * Nguồn chuẩn là zod (quyết định PO 24/09/2026) — không sửa tay tệp `.json`.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

import {
  CREATIVE_STUDIO_SCHEMA_DIR,
  buildCreativeStudioSchemaFiles,
  serializeSchemaFile,
} from "../src/modules/creative-production/contracts/json-schema"

const check = process.argv.includes("--check")
const dir = path.resolve(__dirname, "..", CREATIVE_STUDIO_SCHEMA_DIR)
const files = buildCreativeStudioSchemaFiles()
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
    console.error(`[schemas:creative] LỆCH mã — cũ/thiếu: ${stale.join(", ") || "không"}; thừa: ${extra.join(", ") || "không"}`)
    console.error("Chạy `npm run gen:schemas:creative` rồi commit cùng thay đổi zod.")
    process.exit(1)
  }
  console.log(`[schemas:creative] khớp — ${files.length} tệp.`)
} else {
  console.log(`[schemas:creative] ghi ${stale.length}/${files.length} tệp vào ${CREATIVE_STUDIO_SCHEMA_DIR}.`)
  if (extra.length) console.warn(`[schemas:creative] tệp thừa (xoá tay nếu không dùng): ${extra.join(", ")}`)
}
