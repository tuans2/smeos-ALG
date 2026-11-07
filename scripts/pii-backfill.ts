/**
 * ADR-014 P-5a: mã hoá toàn bộ cột cá nhân còn chữ rõ, chạy một lần ngay sau khi đặt `PII_ENCRYPTION_KEY` (Render shell của
 * smeos-web: `npm run pii:backfill`). Lặp từng lô 500 dòng mỗi bảng tới khi không còn dòng nào; lượt quét nền 5 phút vẫn
 * xử lý phần phát sinh sau đó. Không in dữ liệu, chỉ in số dòng.
 */
import { asSystemDb } from "@/core/tenancy/db-context"
import { piiMasterKey } from "@/core/security/pii-cipher"
import { runPiiBackfill } from "@/core/security/infra/pii-backfill"

async function main() {
  if (!piiMasterKey()) throw new Error("Chưa đặt PII_ENCRYPTION_KEY — không mã hoá gì")
  let total = 0
  for (let round = 1; round <= 10_000; round++) {
    const done = await asSystemDb("script:pii-backfill", () => runPiiBackfill(500))
    const n = Object.values(done).reduce((a, b) => a + (b ?? 0), 0)
    total += n
    console.log(`lượt ${round}: ${JSON.stringify(done)}`)
    if (n === 0) break
  }
  console.log(`xong: ${total} dòng`)
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
