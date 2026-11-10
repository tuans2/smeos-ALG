import { readFileSync } from "node:fs"
import path from "node:path"

import type { PhaseManifest, PhaseTrace } from "./trace-phase"

/**
 * Sinh danh sách route của giai đoạn (`src/lib/delivery/<phase>.routes.json`) cho chế độ chỉ bật phạm vi
 * giao, và báo cáo phụ thuộc (`docs/plan/BANGIAO_<PHASE>_PHU_THUOC.md`, Bước 2.5).
 * Chạy bằng `scripts/release/routes-cli.ts`.
 */

export function routesFile(phase: string): string {
  return `src/lib/delivery/${phase}.routes.json`
}

export function reportFile(phase: string): string {
  return `docs/plan/BANGIAO_${phase.toUpperCase()}_PHU_THUOC.md`
}

export function loadManifest(root: string, phase: string): PhaseManifest {
  return JSON.parse(readFileSync(path.join(root, `src/lib/delivery/${phase}.manifest.json`), "utf8")) as PhaseManifest
}

export function renderRoutes(phase: string, trace: PhaseTrace): string {
  const { pages, apis, blockedPages, blockedApis } = trace
  return `${JSON.stringify({ phase, pages, apis, blockedPages, blockedApis }, null, 2)}\n`
}

function moduleRows(trace: PhaseTrace): string[] {
  const total = new Map<string, number>()
  const kept = new Map<string, number>()
  const count = (map: Map<string, number>, file: string) => {
    const match = /^src\/modules\/([^/]+)\//.exec(file)
    if (match) map.set(match[1]!, (map.get(match[1]!) ?? 0) + 1)
  }
  for (const file of [...trace.files, ...trace.droppedFiles]) count(total, file)
  for (const file of trace.files) count(kept, file)
  return [...total.entries()]
    .filter(([name, all]) => (kept.get(name) ?? 0) > 0 && (kept.get(name) ?? 0) < all)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, all]) => `| \`${name}\` | ${kept.get(name) ?? 0}/${all} |`)
}

export function renderReport(phase: string, trace: PhaseTrace, accepted: ReadonlySet<string>): string {
  const violations = trace.violations.map((v) => {
    const key = `${v.from} → ${v.to}`
    return `| \`${v.from}\` | \`${v.to}\` | ${accepted.has(key) ? "Đã ghi nhận, xử lý ở Bước 4" : "**Mới — phải xử lý**"} |`
  })
  const modules = moduleRows(trace)
  return [
    `# Phụ thuộc của bản giao ${phase.toUpperCase()}`,
    "",
    `Sinh bằng \`npm run release:routes\` từ \`src/lib/delivery/${phase}.manifest.json\` — không sửa tay.`,
    "",
    "## Tổng quan",
    "",
    "| Mục | Giữ | Bị chặn hoặc bỏ |",
    "|---|---:|---:|",
    `| Trang | ${trace.pages.length} | ${trace.blockedPages.length} |`,
    `| API | ${trace.apis.length} | ${trace.blockedApis.length} |`,
    `| Tệp trong \`src/\` | ${trace.files.length} | ${trace.droppedFiles.length} |`,
    "",
    "## Code trong phạm vi chạm vùng không giao",
    "",
    violations.length ? "| Từ | Tới | Trạng thái |\n|---|---|---|\n" + violations.join("\n") : "Không có.",
    "",
    "## Liên kết tới trang không giao",
    "",
    "Đường dẫn viết cứng trong mã được giao; bật chế độ giai đoạn hoặc trong bản cắt, người dùng bấm vào sẽ gặp trang 404. Xử lý ở Bước 4.",
    "",
    trace.deadLinks.length
      ? "| Từ | Tới |\n|---|---|\n" + trace.deadLinks.map((l) => `| \`${l.from}\` | \`${l.to}\` |`).join("\n")
      : "Không có.",
    "",
    "## Mô-đun bị cắt giữa chừng",
    "",
    "Tệp còn lại / tổng số tệp của mô-đun. Phần bị bỏ không được tệp nào trong phạm vi dùng tới.",
    "",
    modules.length ? "| Mô-đun | Giữ |\n|---|---:|\n" + modules.join("\n") : "Không có.",
    "",
    "## API bị chặn khi bật chế độ giai đoạn",
    "",
    "Có route nhưng không trang, API hay tác vụ nào trong phạm vi gọi tới.",
    "",
    ...trace.blockedApis.map((api) => `- \`${api}\``),
    "",
  ].join("\n")
}

export function acceptedViolations(manifest: PhaseManifest): Set<string> {
  return new Set(manifest.acceptedViolations.flatMap((group) => group.items))
}
