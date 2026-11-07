/**
 * gen-openapi.ts — sinh OpenAPI 3.1 từ lược đồ zod (audit API đợt 4–6):
 *   - Integration API: `src/modules/integration/contracts/integration-openapi.ts`
 *   - Bề mặt công khai `/public/*`: `src/app/api/v1/public/_contracts/public-openapi.ts`
 *
 *   npm run gen:openapi      ghi lại các tệp
 *   npm run check:openapi    chỉ kiểm, thoát 1 nếu có tệp cũ
 *
 * CI không cần bước riêng: `tests/unit/integration/integration-openapi.test.ts` và
 * `tests/unit/public/public-openapi.test.ts` (chạy trong `npm test`) so cùng nội dung với tệp đã commit.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { buildPlatformOpenApi, PLATFORM_OPENAPI_PATH } from "../src/app/api/v1/platform/_contracts/platform-openapi"
import { buildPublicOpenApi, PUBLIC_OPENAPI_PATH } from "../src/app/api/v1/public/_contracts/public-openapi"
import { serializeOpenApi } from "../src/core/http/openapi"
import { buildIntegrationOpenApi, INTEGRATION_OPENAPI_PATH } from "../src/modules/integration/contracts/integration-openapi"

const DOCUMENTS: Array<{ path: string; build: () => Record<string, unknown> }> = [
  { path: INTEGRATION_OPENAPI_PATH, build: buildIntegrationOpenApi },
  { path: PUBLIC_OPENAPI_PATH, build: buildPublicOpenApi },
  { path: PLATFORM_OPENAPI_PATH, build: buildPlatformOpenApi },
]

const check = process.argv.includes("--check")

// Đọc thẳng, bắt ENOENT — không `existsSync` rồi mới đọc/ghi (CodeQL js/file-system-race).
function readCurrent(target: string): string | null {
  try {
    return readFileSync(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

let stale = 0
for (const doc of DOCUMENTS) {
  const target = path.resolve(__dirname, "..", doc.path)
  const text = serializeOpenApi(doc.build())
  const current = readCurrent(target)
  if (current === text) {
    console.log(`[openapi] ${doc.path} ${check ? "khớp mã" : "không đổi"}.`)
  } else if (check) {
    console.error(`[openapi] ${doc.path} LỆCH mã — chạy \`npm run gen:openapi\` rồi commit cùng thay đổi zod.`)
    stale++
  } else {
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, text)
    console.log(`[openapi] đã ghi ${doc.path}.`)
  }
}
if (stale) process.exit(1)
