import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { STORAGE_REFERENCE_SOURCES } from "@/modules/assets/infra/storage-registry-keys"

/**
 * SDAGF-002/022 (audit docs/audit/sdagf-2026-10): mọi nơi GHI tệp lên kho phải
 * khai ở đây cùng nguồn registry trỏ tới tệp đó. Tệp không có registry thì
 * đối soát báo nhầm là mồ côi và đếm tham chiếu khi xoá bỏ sót — xoá mất
 * tệp còn dùng. Thêm nơi ghi mới: thêm nguồn ở `STORAGE_REFERENCE_SOURCES`
 * + `countPayloadReferences`, rồi khai dòng ở đây.
 */
const WRITERS: Record<string, (typeof STORAGE_REFERENCE_SOURCES)[number]> = {
  "src/app/api/v1/storage/[...key]/route.ts": "assets.storage_key",
  "src/modules/ad-banner-poster/use-cases/save-banner-to-library.use-case.ts": "assets.storage_key",
  "src/modules/audio-studio/use-cases/music-tracks.ts": "music_tracks.storage_key",
  "src/modules/audio-studio/use-cases/voice-clones.ts": "voice_clones.sample_storage_key",
  "src/modules/avi-gift-import/use-cases/import-analyses.ts": "assets.storage_key",
  "src/modules/brand-kit/use-cases/store-generated-logo.ts": "assets.storage_key",
  "src/modules/greeting-card/use-cases/upload-payment-proof.ts": "assets.storage_key",
  "src/app/api/v1/coordinator/orders/[id]/confirm-delivery/route.ts": "order_coordinations.metadata.pod_photos",
  "src/app/api/v1/coordinator/orders/[id]/upload-qc-subcontract/route.ts": "order_coordinations.metadata.qc_photos",
  "src/app/api/v1/public/subcontract/[orderCode]/upload-qc/route.ts": "order_coordinations.metadata.qc_photos",
  "src/app/api/v1/public/subcontract/[orderCode]/submit-delivery/route.ts": "order_coordinations.metadata.pod_photos",
  "src/modules/platform/use-cases/partner-marketplace-photos.ts": "partner_marketplace_stores.photo_keys",
  "workers/media_ai/jobs/worker.py": "assets.storage_key",
  "workers/media_ai/jobs/variant_worker.py": "assets.storage_key",
  "workers/media_ai/audio/audio_worker.py": "generation_jobs.output.audio_storage_key",
  "workers/media_ai/video/video_worker.py": "video_jobs.final_video_url",
}

const ROOT = path.resolve(__dirname, "../../..")
const TS_WRITE = /\b(getStorageProvider\(\)|storage|deps\.storage)\.put\(/
const PY_WRITE = /\b(ghi_bytes|_upload_to_storage|_ghi_kho)\(/

function files(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".venv" || name === "generated" || name === "tests" || name === "__pycache__") return []
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return files(full, ext)
    return full.endsWith(ext) && !/\.test\.tsx?$/.test(full) ? [full] : []
  })
}

function writers(dir: string, ext: string, pattern: RegExp, skip: RegExp): string[] {
  return files(path.join(ROOT, dir), ext)
    .filter((f) => readFileSync(f, "utf8").split("\n").some((line) => pattern.test(line) && !skip.test(line)))
    .map((f) => path.relative(ROOT, f).split(path.sep).join("/"))
}

describe("hợp đồng ghi kho tệp", () => {
  it("mọi nơi ghi tệp (TS) đều đã khai nguồn registry", () => {
    const found = writers("src", ".ts", TS_WRITE, /^\s*(\*|\/\/)/)
    expect(found.filter((f) => !(f in WRITERS))).toEqual([])
  })

  it("mọi nơi ghi tệp (worker Python) đều đã khai nguồn registry", () => {
    const found = writers("workers", ".py", PY_WRITE, /^\s*(#|def )/)
    expect(found.filter((f) => !(f in WRITERS))).toEqual([])
  })

  it("không khai thừa: mỗi dòng trong danh sách vẫn còn ghi tệp", () => {
    const found = new Set([
      ...writers("src", ".ts", TS_WRITE, /^\s*(\*|\/\/)/),
      ...writers("workers", ".py", PY_WRITE, /^\s*(#|def )/),
    ])
    expect(Object.keys(WRITERS).filter((f) => !found.has(f))).toEqual([])
  })

  it("đếm tham chiếu khi xoá xét đủ mọi nguồn registry", () => {
    const src = readFileSync(path.join(ROOT, "src/modules/assets/infra/payload-references.ts"), "utf8")
    for (const source of STORAGE_REFERENCE_SOURCES) {
      const [table, ...rest] = source.split(".")
      expect(src, source).toContain(`prisma.${table}.count`)
      expect(src, source).toContain(rest[rest.length - 1]!)
    }
  })
})
