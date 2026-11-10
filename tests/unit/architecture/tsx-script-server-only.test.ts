import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * Script chạy bằng `tsx` ngoài Next.js: gói `server-only` luôn ném lỗi, trừ khi Node chạy với điều kiện
 * `react-server`. Lệnh npm nào chạy `tsx … scripts/*.ts` mà chuỗi import (không tính `import type`) chạm tới
 * một tệp `import "server-only"` thì phải có `--conditions=react-server` (mẫu `storage:reconcile`).
 * Lỗi thật 10/11/2026: `scripts/backfill-chat-rooms.ts` → `chat-event-hub.ts` → `redis-client.ts`.
 */
const ROOT = resolve(__dirname, "../../..")
/** Nợ có sẵn trên `main`, ngoài phạm vi chat (`[PROD]`): sửa xong thì xoá khỏi đây — test bên dưới sẽ nhắc. */
const KNOWN_BROKEN = new Set<string>()
const IMPORT_RE = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm

function resolveLocal(fromFile: string, spec: string): string | null {
  let base: string
  if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2))
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec)
  else return null
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate
  }
  return null
}

/** Trả chuỗi import dẫn tới tệp có `import "server-only"`, hoặc null. */
function serverOnlyChain(entry: string): string[] | null {
  const parent = new Map<string, string | null>([[entry, null]])
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift() as string
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1] as string
      if (spec === "server-only") {
        const chain: string[] = []
        for (let f: string | null = file; f; f = parent.get(f) ?? null) chain.unshift(f.slice(ROOT.length + 1))
        return chain
      }
      const next = resolveLocal(file, spec)
      if (next && !parent.has(next)) {
        parent.set(next, file)
        queue.push(next)
      }
    }
  }
  return null
}

describe("Script tsx chạm server-only phải chạy với --conditions=react-server", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> }
  const tsxScripts = Object.entries(pkg.scripts).flatMap(([name, command]) => {
    const target = /\btsx\b.*?\s(scripts\/\S+\.ts)\b/.exec(command)?.[1]
    return target ? [{ name, command, target }] : []
  })

  it("tìm thấy các lệnh tsx trong package.json", () => {
    expect(tsxScripts.length).toBeGreaterThan(0)
  })

  it("có lệnh npm chạy backfill phòng trao đổi nội bộ", () => {
    expect(tsxScripts.map((s) => s.target)).toContain("scripts/backfill-chat-rooms.ts")
  })

  it.each(tsxScripts.filter((s) => !KNOWN_BROKEN.has(s.name)))("$name", ({ command, target }) => {
    const chain = serverOnlyChain(join(ROOT, target))
    if (chain) expect(command, `chuỗi import: ${chain.join(" → ")}`).toContain("--conditions=react-server")
  })

  it.each([...KNOWN_BROKEN])("ngoại lệ %s vẫn còn lỗi (sửa rồi thì xoá khỏi KNOWN_BROKEN)", (name) => {
    const script = tsxScripts.find((s) => s.name === name)
    expect(script).toBeDefined()
    const broken = !!script && !script.command.includes("--conditions=react-server") && !!serverOnlyChain(join(ROOT, script.target))
    expect(broken).toBe(true)
  })
})
