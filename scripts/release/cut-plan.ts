import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

import { importSpecifiers, readSource, resolveImport } from "./trace-imports"
import { isTestFile, tracePhase, type PhaseManifest, type PhaseTrace } from "./trace-phase"

/**
 * Lập danh sách giữ/bỏ cho bản cắt (Bước 2.3 của kế hoạch bàn giao GD1) trên một cây đã `git archive`.
 * Không ghi gì xuống đĩa — `cut-apply.ts` thực hiện.
 */
export interface CutConfig {
  keepTopLevel: string[]
  keepDocs: string[]
  removePaths: { reason: string; paths: string[] }[]
  dropNpmScripts: string[]
  removedPythonPackages: string[]
  overlay: string
  /** Lệnh npm sinh lại tệp từ mã (OpenAPI, JSON Schema, ERD…) chạy trên bản cắt. */
  regenerate: string[]
}

export type CutManifest = PhaseManifest & { cut: CutConfig }

export interface Removal {
  path: string
  reason: string
}

export interface DroppedTest {
  path: string
  /** Tệp nó cần mà bản cắt không còn. */
  missing: string[]
  /** Test chạm cả code được giao — cần người xem lại trước khi giao. */
  touchesDelivered: boolean
}

export interface CutPlan {
  trace: PhaseTrace
  keep: string[]
  removals: Removal[]
  droppedTests: DroppedTest[]
  droppedNpmScripts: { name: string; reason: string }[]
  /** Tệp được giữ nhưng nằm trong danh sách bỏ — phải xử lý trước khi cắt. */
  conflicts: Removal[]
  /** Tài liệu/baseline giữ lại vì code hoặc test còn lại đọc theo đường dẫn. */
  keptForReading: string[]
}

export function listFiles(root: string, dir = ""): string[] {
  return readdirSync(path.join(root, dir)).flatMap((entry) => {
    const rel = dir ? `${dir}/${entry}` : entry
    return statSync(path.join(root, rel)).isDirectory() ? listFiles(root, rel) : [rel]
  })
}

const TS = /\.(tsx?|mts|mjs|jsx?)$/
const TS_OR_SHELL = /\.(tsx?|mts|mjs|jsx?|py|sh)$/
/** Đường dẫn tệp trong repo viết thẳng trong mã (test đọc tài liệu, baseline bằng `readFileSync`). */
const REPO_PATH_LITERAL = /["'`](?:\.\.\/)*((?:docs|scripts|prisma|public|workers|tests|src)\/[^"'`$\s*{}]+\.[A-Za-z0-9]+)["'`]/g
/** Như trên nhưng nhận cả thư mục (`"../src/components/x"`) — test quét cả thư mục mã nguồn. */
const SRC_PATH_LITERAL = /["'`](?:\.\.\/)*(src\/[^"'`$\s*{}]+?)\/?["'`]/g
/** Lý do bỏ "mềm": tệp được giữ lại nếu code còn lại đọc nó theo đường dẫn. */
const SOFT_REASONS = new Set(["Tài liệu nội bộ", "Script không còn lệnh nào dùng"])
const PY_IMPORT = /^\s*(?:from\s+([\w.]+)\s+import\s+([\w, ]*)|import\s+([\w.]+))/gm

function pythonImports(source: string): string[] {
  const out: string[] = []
  for (const match of source.matchAll(PY_IMPORT)) {
    if (match[3]) out.push(match[3])
    else if (match[1]) out.push(match[1], ...match[2]!.split(",").map((name) => name.trim()).filter(Boolean).map((name) => `${match[1]}.${name}`))
  }
  return out
}

/** Đường dẫn tệp được nhắc trong lệnh npm (`scripts/x.ts`, `prisma/seed.ts`). */
function commandPaths(command: string): string[] {
  return [...command.matchAll(/(?:^|[\s"'=])((?:scripts|prisma|src|tests)\/[\w./@[\]()-]+\.(?:ts|mts|mjs|js|py|sh))/g)].map((m) => m[1]!)
}

export function planCut(root: string, manifest: CutManifest, npmScripts: Record<string, string>): CutPlan {
  const { cut } = manifest
  const all = listFiles(root)
  const removals: Removal[] = []
  const conflicts: Removal[] = []
  const removalReason = (file: string) => cut.removePaths.find((group) => group.paths.some((p) => file.startsWith(p)))?.reason

  const candidate = new Set<string>()
  for (const file of all) {
    const top = file.split("/")[0]!
    const denied = removalReason(file)
    if (!cut.keepTopLevel.includes(top)) removals.push({ path: file, reason: "Ngoài danh sách thư mục giao" })
    else if (denied) removals.push({ path: file, reason: denied })
    else if (top === "docs" && !cut.keepDocs.some((prefix) => file.startsWith(prefix))) removals.push({ path: file, reason: "Tài liệu nội bộ" })
    else candidate.add(file)
  }

  // Lệnh npm: bỏ lệnh trong danh sách hoặc trỏ tới tệp không còn; lặp vì lệnh gọi `npm run` lệnh khác
  const droppedNpmScripts: { name: string; reason: string }[] = cut.dropNpmScripts
    .filter((name) => name in npmScripts)
    .map((name) => ({ name, reason: "Không giao" }))
  for (let changed = true; changed; ) {
    changed = false
    const dropped = new Set(droppedNpmScripts.map((s) => s.name))
    for (const [name, command] of Object.entries(npmScripts)) {
      if (dropped.has(name)) continue
      const missing = commandPaths(command).find((file) => !candidate.has(file))
      const calls = [...command.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]!).find((call) => dropped.has(call))
      if (missing || calls) {
        droppedNpmScripts.push({ name, reason: missing ? `Tệp \`${missing}\` không giao` : `Gọi lệnh \`${calls}\` đã bỏ` })
        changed = true
      }
    }
  }

  // scripts/: chỉ giữ tệp được lệnh npm hoặc CI còn lại dùng tới, kèm import của chúng
  const dropped = new Set(droppedNpmScripts.map((s) => s.name))
  // Workflow của bản giao: bản trong lớp phủ thay bản của smeOS cùng đường dẫn; workflow bị bỏ không tính
  const overlayPrefix = `${cut.overlay}/`
  const workflows = new Set([
    ...all.filter((f) => f.startsWith(".github/workflows/") && candidate.has(f)),
    ...all.filter((f) => f.startsWith(`${overlayPrefix}.github/workflows/`)).map((f) => f.slice(overlayPrefix.length)),
  ])
  const workflowText = [...workflows]
    .map((f) => readSource(root, existsSync(path.join(root, overlayPrefix, f)) ? `${overlayPrefix}${f}` : f))
    .join("\n")
  const scriptRoots = [
    ...Object.entries(npmScripts).filter(([name]) => !dropped.has(name)).flatMap(([, command]) => commandPaths(command)),
    ...commandPaths(workflowText),
  ].filter((file) => file.startsWith("scripts/") && candidate.has(file))
  const usedScripts = new Set<string>()
  const queue = [...scriptRoots]
  while (queue.length) {
    const file = queue.pop()!
    if (usedScripts.has(file)) continue
    usedScripts.add(file)
    if (!TS.test(file)) continue
    for (const spec of importSpecifiers(readSource(root, file))) {
      const target = resolveImport(root, file, spec)
      if (target?.startsWith("scripts/") && candidate.has(target)) queue.push(target)
    }
  }
  for (const file of [...candidate]) {
    if (file.startsWith("scripts/") && TS_OR_SHELL.test(file) && !usedScripts.has(file) && !isTestFile(file)) {
      candidate.delete(file)
      removals.push({ path: file, reason: "Script không còn lệnh nào dùng" })
    }
  }

  // Dò code src: gốc là trang/API của giai đoạn, cộng script và seed còn giữ
  const extraRoots = [...candidate].filter((file) => TS.test(file) && /^(scripts|prisma)\//.test(file) && !isTestFile(file))
  const trace = tracePhase(root, { ...manifest, rootFiles: [...manifest.rootFiles, ...extraRoots] })
  const keptSrc = new Set(trace.files)
  for (const file of [...candidate]) {
    if (!file.startsWith("src/") || isTestFile(file) || keptSrc.has(file) || file.startsWith("src/generated/")) continue
    candidate.delete(file)
    removals.push({ path: file, reason: "Code ngoài phạm vi giao" })
  }
  for (const removal of removals) {
    if (keptSrc.has(removal.path)) conflicts.push(removal)
  }

  // Python: bỏ tệp import gói không giao
  const removedPy = cut.removedPythonPackages
  for (const file of [...candidate]) {
    if (!file.endsWith(".py")) continue
    const hit = pythonImports(readSource(root, file)).find((mod) => removedPy.some((pkg) => mod === pkg || mod.startsWith(`${pkg}.`)))
    if (!hit) continue
    candidate.delete(file)
    if (/(^|\/)test_[^/]*\.py$/.test(file)) removals.push({ path: file, reason: `Test của gói không giao (\`${hit}\`)` })
    else conflicts.push({ path: file, reason: `Import gói không giao \`${hit}\`` })
  }

  // Test TS: giữ khi mọi tệp nội bộ nó import còn trong bản cắt
  const droppedTests: DroppedTest[] = []
  for (let changed = true; changed; ) {
    changed = false
    for (const file of [...candidate]) {
      if (!TS.test(file) || !(isTestFile(file) || file.startsWith("tests/"))) continue
      const targets = importSpecifiers(readSource(root, file))
        .map((spec) => resolveImport(root, file, spec))
        .filter((target): target is string => target !== null && existsSync(path.join(root, target)))
      // Test đọc mã nguồn theo đường dẫn (`readFileSync("src/…")`) cũng phụ thuộc tệp đó
      const read = [...readSource(root, file).matchAll(SRC_PATH_LITERAL)]
        .map((m) => m[1]!)
        .filter((target) => existsSync(path.join(root, target)))
      const gone = (target: string) =>
        statSync(path.join(root, target)).isDirectory()
          ? ![...candidate].some((kept) => kept.startsWith(`${target}/`))
          : !candidate.has(target)
      const missing = [...new Set([...targets, ...read])].filter(gone)
      if (missing.length === 0) continue
      candidate.delete(file)
      changed = true
      if (isTestFile(file)) droppedTests.push({ path: file, missing, touchesDelivered: targets.some((target) => keptSrc.has(target)) })
      else removals.push({ path: file, reason: "Tiện ích test chỉ dùng cho phần không giao" })
    }
  }
  for (const test of droppedTests) removals.push({ path: test.path, reason: "Test của phần không giao" })

  // Tệp mà code còn lại đọc theo đường dẫn (tài liệu đặc tả, baseline): giữ, báo cáo riêng
  const keptForReading: string[] = []
  const soft = new Map(removals.filter((r) => SOFT_REASONS.has(r.reason)).map((r) => [r.path, r]))
  for (const file of [...candidate].filter((f) => TS.test(f))) {
    for (const match of readSource(root, file).matchAll(REPO_PATH_LITERAL)) {
      const removal = soft.get(match[1]!)
      if (!removal) continue
      soft.delete(removal.path)
      removals.splice(removals.indexOf(removal), 1)
      candidate.add(removal.path)
      keptForReading.push(removal.path)
    }
  }

  return {
    trace,
    keep: [...candidate].sort(),
    removals: removals.sort((a, b) => a.path.localeCompare(b.path)),
    droppedTests: droppedTests.sort((a, b) => a.path.localeCompare(b.path)),
    droppedNpmScripts,
    conflicts,
    keptForReading: keptForReading.sort(),
  }
}
