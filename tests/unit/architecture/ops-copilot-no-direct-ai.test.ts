import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Quy tắc AI (CLAUDE.md #5): mọi lệnh gọi AI qua `callCapability` — không gọi thẳng nhà cung cấp.
 * Ops Copilot từng gọi thẳng OpenAI/Ollama bằng `fetch` (soát 14/10/2026). Chặn tái phát.
 */
const ROOT = path.resolve(__dirname, "../../..")
const OPS_COPILOT = path.join(ROOT, "src/modules/chat-assistant/ops-copilot")
const DIRECT_PROVIDER = /\bfetch\(|process\.env\.(OPENAI|OLLAMA|DIFY|ANTHROPIC)|api\.openai\.com|chat\/completions/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [full] : []
  })
}

describe("Ops Copilot — không gọi thẳng nhà cung cấp AI", () => {
  it("không có fetch/khoá API nhà cung cấp trong mã Ops Copilot", () => {
    const offenders = sourceFiles(OPS_COPILOT).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => DIRECT_PROVIDER.test(line))
        .map((line) => `${path.relative(ROOT, file)}: ${line.trim()}`)
    )
    expect(offenders).toEqual([])
  })
})
