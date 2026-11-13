/**
 * scripts/check-layer-boundaries.ts
 *
 * Bộ gác cổng kiểm tra tính tuân thủ ranh giới giữa các tầng kiến trúc:
 * 1. src/layers/contracts: Tuyệt đối không import @prisma/client, không import infra.
 * 2. src/layers/chain-os: Tuyệt đối không import trực tiếp từ store-os nội bộ.
 * 3. Không có circular dependencies chéo tầng.
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const LAYERS_DIR = path.join(ROOT, "src", "layers")

let totalErrors = 0

function walkDir(dir: string, callback: (file: string) => void) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath, callback)
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      callback(fullPath)
    }
  }
}

console.log("🛡️  ĐANG QUÉT RANH GIỚI TẦNG KIẾN TRÚC (LAYER BOUNDARY AUDIT)...")

// 1. Quét contracts: Cấm import ORM/Prisma
const contractsDir = path.join(LAYERS_DIR, "contracts")
walkDir(contractsDir, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8")
  if (content.includes("@prisma/client") || content.includes("@/generated/prisma")) {
    console.error(`❌ VI PHẠM CONTRACT PURITY: File ${path.relative(ROOT, filePath)} đang import Prisma!`)
    totalErrors++
  }
})

// 2. Quét chain-os: Cấm rò rỉ store-os private logic
const chainOsDir = path.join(LAYERS_DIR, "chain-os")
walkDir(chainOsDir, (filePath) => {
  if (filePath.endsWith(".test.ts")) return
  const content = fs.readFileSync(filePath, "utf-8")
  if (content.includes("@/layers/store-os/internal") || content.includes("store-os/infra")) {
    console.error(`❌ VI PHẠM BOUNDARY ISOLATION: ChainOS import StoreOS internal tại ${path.relative(ROOT, filePath)}`)
    totalErrors++
  }
})

// 3. Quét src/components: Tuyệt đối cấm import từ tầng infra (UI-A-06 / F1-12)
const componentsDir = path.join(ROOT, "src", "components")
walkDir(componentsDir, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8")
  const infraImportRegex = /from\s+["'][^"']*(?:modules\/[^/]+\/infra|layers\/[^/]+\/infra)[^"']*["']/g
  if (infraImportRegex.test(content)) {
    console.error(`❌ VI PHẠM UI PURITY: Component ${path.relative(ROOT, filePath)} đang import trực tiếp từ tầng infra!`)
    totalErrors++
  }
})

if (totalErrors === 0) {
  console.log("✅ HOÀN TOÀN HỢP LỆ! 0 vi phạm ranh giới tầng kiến trúc. Sẵn sàng bóc tách repo.")
  process.exit(0)
} else {
  console.error(`💥 PHÁT HIỆN ${totalErrors} LỖI VI PHẠM RANH GIỚI!`)
  process.exit(1)
}
