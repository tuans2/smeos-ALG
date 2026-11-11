import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { applyCut } from "./cut-apply"
import { listFiles, planCut, type CutManifest } from "./cut-plan"
import { stripFiles } from "./cut-strip"

/**
 * Cắt repo bàn giao (kế hoạch GD1, Bước 2.3):
 *
 *   npm run release:cut -- gd1 <mốc git> <thư mục đích ngoài repo> [--plan]
 *
 * `--plan` chỉ in số liệu, không ghi gì. Báo cáo ghi cạnh thư mục đích: `<đích>.report.md`.
 */
function fail(message: string): never {
  console.error(`[release:cut] ${message}`)
  process.exit(1)
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
const planOnly = process.argv.includes("--plan")
const [phase, ref, outArg] = args
if (!phase || !ref || !outArg) fail("Cách dùng: npm run release:cut -- gd1 <mốc> <thư mục đích> [--plan]")

const repo = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim()
const out = path.resolve(outArg)
if (out === repo || out.startsWith(`${repo}${path.sep}`)) fail("Thư mục đích phải nằm ngoài repo")
if (existsSync(out) && readdirSync(out).length > 0) fail(`Thư mục đích ${out} không trống`)
const sha = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: repo }).toString().trim()
if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: repo }).toString().trim() === "true") {
  fail("Repo đang là bản clone nông (shallow): cần đủ lịch sử để mang báo nhầm gitleaks sang bản cắt — chạy `git fetch --unshallow`")
}

mkdirSync(out, { recursive: true })
execFileSync("sh", ["-c", 'git archive --format=tar "$1" | tar -x -C "$2"', "sh", sha, out], { cwd: repo, stdio: "inherit" })

const stripped = stripFiles(out, listFiles(out))
if (stripped.length) console.log(`[release:cut] bỏ khối @release-strip trong: ${stripped.join(", ")}`)
const manifest = JSON.parse(readFileSync(path.join(out, `src/lib/delivery/${phase}.manifest.json`), "utf8")) as CutManifest
const pkg = JSON.parse(readFileSync(path.join(out, "package.json"), "utf8")) as { scripts: Record<string, string> }
const plan = planCut(out, manifest, pkg.scripts)
console.log(
  `[release:cut] ${phase} @ ${sha.slice(0, 8)}: giữ ${plan.keep.length} tệp, bỏ ${plan.removals.length}, ` +
    `test bỏ ${plan.droppedTests.length} (xem lại ${plan.droppedTests.filter((t) => t.touchesDelivered).length}), ` +
    `lệnh npm bỏ ${plan.droppedNpmScripts.length}`,
)
if (plan.conflicts.length) {
  for (const conflict of plan.conflicts) console.error(`  - ${conflict.path}: ${conflict.reason}`)
  fail(`${plan.conflicts.length} tệp vừa được giữ vừa nằm trong danh sách bỏ — sửa manifest hoặc code trước khi cắt`)
}
if (planOnly) process.exit(0)

const report = applyCut(out, phase, manifest, plan, sha, repo)
writeFileSync(`${out}.report.md`, report)
console.log(`[release:cut] Xong: ${out} (báo cáo ${out}.report.md)`)
