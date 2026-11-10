import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, symlinkSync, unlinkSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

import { rebuildBaselines } from "./cut-baselines"
import { carryIgnores, parseGitleaksIgnore, renderGitleaksIgnore, type CarriedIgnores } from "./cut-gitleaks"
import type { CutManifest, CutPlan } from "./cut-plan"
import { renderCutRoutes, routesFile } from "./gen-phase-routes"
import { tracePhase } from "./trace-phase"

/** Thực hiện bản cắt trên cây đã giải nén (Bước 2.3 mục 3–7). Trả nội dung báo cáo. */
/** `.gitleaksignore` của repo nguồn ở mốc cắt, đối chiếu với bản cắt (`cut-gitleaks.ts`). */
function carryGitleaksIgnores(root: string, repo: string, ref: string): CarriedIgnores {
  const show = (spec: string): string | null => {
    try {
      return execFileSync("git", ["show", spec], { cwd: repo, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString()
    } catch {
      return null
    }
  }
  const source = show(`${ref}:.gitleaksignore`)
  if (!source) return { entries: [], dropped: [] }
  const readCut = (file: string) => (existsSync(path.join(root, file)) ? readFileSync(path.join(root, file), "utf8") : null)
  return carryIgnores(parseGitleaksIgnore(source), (commit, file) => show(`${commit}:${file}`), readCut)
}

function removeEmptyDirs(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory() && entry !== ".git") removeEmptyDirs(full)
  }
  if (readdirSync(dir).length === 0) rmdirSync(dir)
}

function listFiles(root: string, dir = ""): string[] {
  return readdirSync(path.join(root, dir)).flatMap((entry) => {
    const rel = dir ? `${dir}/${entry}` : entry
    if (rel === ".git") return []
    return statSync(path.join(root, rel)).isDirectory() ? listFiles(root, rel) : [rel]
  })
}

/**
 * Sinh lại tệp từ mã bằng `node_modules` của repo nguồn (gắn tạm bằng symlink, gỡ trước khi commit).
 * Lệnh đã bị bỏ khỏi package.json thì bỏ qua.
 */
function regenerate(root: string, repo: string, scripts: readonly string[], available: Record<string, string>): string[] {
  const modules = path.join(repo, "node_modules")
  if (!existsSync(modules)) return []
  const link = path.join(root, "node_modules")
  symlinkSync(modules, link)
  // Prisma client đã sinh (`src/generated`, không commit): lược đồ OpenAPI import mã chạy thật chạm tới nó
  // (vd. requests-marketing → create-staff-lead → prisma), nên gắn tạm như `node_modules`.
  const generated = path.join(repo, "src", "generated")
  const generatedLink = path.join(root, "src", "generated")
  const linkGenerated = existsSync(generated) && !existsSync(generatedLink)
  if (linkGenerated) symlinkSync(generated, generatedLink)
  try {
    const ran = scripts.filter((name) => name in available)
    for (const name of ran) execFileSync("npm", ["run", "--silent", name], { cwd: root, stdio: ["ignore", "ignore", "inherit"] })
    return ran
  } finally {
    unlinkSync(link)
    if (linkGenerated) unlinkSync(generatedLink)
  }
}

export function applyCut(root: string, phase: string, manifest: CutManifest, plan: CutPlan, ref: string, repo: string): string {
  // Lớp phủ nằm trong `releases/` — sẽ bị xoá cùng thư mục đó, nên chép ra trước
  const overlayDir = path.join(root, manifest.cut.overlay)
  const overlayFiles = existsSync(overlayDir) ? listFiles(overlayDir) : []
  const overlay = overlayFiles.map((file) => [file, readFileSync(path.join(overlayDir, file))] as const)

  for (const removal of plan.removals) rmSync(path.join(root, removal.path), { force: true })
  removeEmptyDirs(root)

  const pkgPath = path.join(root, "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts: Record<string, string> }
  for (const script of plan.droppedNpmScripts) delete pkg.scripts[script.name]
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  const baselines = rebuildBaselines(root)
  // Chế độ giai đoạn gắn sẵn trong bản cắt. Ghi trước khi sinh lại OpenAPI (đọc danh sách này)
  writeFileSync(path.join(root, routesFile(phase)), renderCutRoutes(phase, tracePhase(root, manifest), plan.trace))
  const regenerated = regenerate(root, repo, manifest.cut.regenerate, pkg.scripts)
  for (const [file, content] of overlay) {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }

  const commit = (message: string) => {
    execFileSync("git", ["add", "-A"], { cwd: root })
    execFileSync("git", ["-c", "user.name=smeOS release", "-c", "user.email=release@invalid", "commit", "-q", "-m", message], { cwd: root })
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim()
  }
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root })
  const first = commit(`chore: bản giao ${phase.toUpperCase()}`)
  const gitleaks = carryGitleaksIgnores(root, repo, ref)
  if (gitleaks.entries.length) {
    // Dấu vân tay gitleaks gắn với commit chứa dòng bị báo, nên ghi ở commit thứ hai trỏ về commit đầu
    writeFileSync(path.join(root, ".gitleaksignore"), renderGitleaksIgnore(first, gitleaks.entries))
    commit("chore: mang sang báo nhầm gitleaks đã duyệt")
  }

  const files = listFiles(root).sort()
  const sums = files.map((file) => `${createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")}  ${file}`)
  return renderCutReport({ phase, ref, plan, baselines, regenerated, overlay: overlayFiles, gitleaks, files: files.length, sums })
}

interface ReportInput {
  phase: string
  ref: string
  plan: CutPlan
  baselines: { file: string; removed: string[] }[]
  regenerated: string[]
  overlay: string[]
  gitleaks: CarriedIgnores
  files: number
  sums: string[]
}

function renderCutReport({ phase, ref, plan, baselines, regenerated, overlay, gitleaks, files, sums }: ReportInput): string {
  const byReason = new Map<string, number>()
  for (const removal of plan.removals) byReason.set(removal.reason, (byReason.get(removal.reason) ?? 0) + 1)
  const review = plan.droppedTests.filter((test) => test.touchesDelivered)
  return [
    `# Báo cáo cắt bản giao ${phase.toUpperCase()}`,
    "",
    `Mốc nguồn: \`${ref}\`. Tệp trong bản cắt: ${files}. Trang ${plan.trace.pages.length}, API ${plan.trace.apis.length}.`,
    "",
    "## Tệp bị bỏ theo lý do",
    "",
    "| Lý do | Số tệp |",
    "|---|---:|",
    ...[...byReason.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => `| ${reason} | ${count} |`),
    "",
    "## Test bị bỏ",
    "",
    `Tổng ${plan.droppedTests.length}. Chạm cả code được giao (cần người xem lại): ${review.length}.`,
    "",
    ...plan.droppedTests.map((test) => `- ${test.touchesDelivered ? "**[xem lại]** " : ""}\`${test.path}\` — thiếu ${test.missing.map((m) => `\`${m}\``).join(", ")}`),
    "",
    "## Tài liệu giữ lại vì code còn đọc",
    "",
    ...(plan.keptForReading.length ? plan.keptForReading.map((file) => `- \`${file}\``) : ["Không có."]),
    "",
    "## Lệnh npm bị bỏ",
    "",
    ...plan.droppedNpmScripts.map((script) => `- \`${script.name}\` — ${script.reason}`),
    "",
    "## Baseline làm lại",
    "",
    ...baselines.map((b) => `- \`${b.file}\`: bỏ ${b.removed.length} mục`),
    "",
    "## Tệp sinh lại từ mã",
    "",
    ...(regenerated.length ? regenerated.map((name) => `- \`npm run ${name}\``) : ["Không chạy (thiếu node_modules ở repo nguồn)."]),
    "",
    "## Lớp phủ",
    "",
    ...(overlay.length ? overlay.map((file) => `- \`${file}\``) : ["Không có."]),
    "",
    "## Báo nhầm gitleaks mang sang",
    "",
    `Mang sang ${gitleaks.entries.length} dòng. Không mang sang (tệp không giao hoặc dòng đã đổi): ${gitleaks.dropped.length}.`,
    ...gitleaks.dropped.map((entry) => `- \`${entry}\``),
    "",
    "## Phụ thuộc vào vùng không giao",
    "",
    ...(plan.trace.violations.length ? plan.trace.violations.map((v) => `- \`${v.from}\` → \`${v.to}\``) : ["Không có."]),
    "",
    "## SHA-256",
    "",
    "```",
    ...sums,
    "```",
    "",
  ].join("\n")
}
