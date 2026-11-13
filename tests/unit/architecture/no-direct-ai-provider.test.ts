import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Quy tắc AI (CLAUDE.md #4, #5): SDK/API nhà cung cấp AI chỉ nằm trong `adapters/` hoặc `src/core/ai/`;
 * mọi chỗ khác gọi qua `callCapability`. Mở rộng từ test Ops Copilot ra toàn `src/` (nợ #197).
 */
const ROOT = path.resolve(__dirname, "../../..")
const SRC = path.join(ROOT, "src")
const DIRECT_PROVIDER = new RegExp(
  [
    String.raw`from ["'](openai|@anthropic-ai\/sdk|@google\/gen(erative-)?ai|replicate|@fal-ai\/[\w-]+|elevenlabs)["']`,
    String.raw`api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis|api\.elevenlabs\.io|chat\/completions`,
    String.raw`process\.env\.(OPENAI|ANTHROPIC|GEMINI|GOOGLE_AI|OLLAMA|DIFY|FAL|STABILITY|REPLICATE|ELEVENLABS)`,
  ].join("|")
)

/** Ngoại lệ có sẵn — chỉ được bớt, không được thêm. */
const KNOWN_EXCEPTIONS: Record<string, string> = {
  // Xoá giọng nhân bản phía ElevenLabs khi tiệm xoá giọng — không phải lệnh sinh nội dung; nên dời vào adapter.
  "src/modules/audio-studio/use-cases/voice-clones.ts": "xoá giọng ở nhà cung cấp",
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === "generated" ? [] : sourceFiles(full)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : []
  })
}

function isAllowedLocation(rel: string): boolean {
  return rel.startsWith("src/core/ai/") || rel.split("/").includes("adapters")
}

describe("Không gọi thẳng nhà cung cấp AI ngoài adapters", () => {
  const offenders = sourceFiles(SRC).flatMap((file) => {
    const rel = path.relative(ROOT, file).split(path.sep).join("/")
    if (isAllowedLocation(rel)) return []
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => DIRECT_PROVIDER.test(line))
      .map((line) => ({ rel, line: line.trim() }))
  })

  it("không có SDK/endpoint/khoá nhà cung cấp AI ngoài adapters", () => {
    expect(offenders.filter((o) => !(o.rel in KNOWN_EXCEPTIONS)).map((o) => `${o.rel}: ${o.line}`)).toEqual([])
  })

  it("danh sách ngoại lệ không còn mục thừa", () => {
    const hit = new Set(offenders.map((o) => o.rel))
    expect(Object.keys(KNOWN_EXCEPTIONS).filter((rel) => !hit.has(rel))).toEqual([])
  })
})
