import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const SRC = path.resolve(__dirname, "../../src")

/** Chuỗi nào xuất hiện là đã đi vòng qua bộ gác tổ chức. */
const FORBIDDEN = ["@prisma/client", "@/generated/prisma", "@/core/tenancy/infra/prisma"]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === "generated") continue
      out.push(...sourceFiles(full))
      continue
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full)
  }
  return out
}

function isInfra(file: string): boolean {
  return path.relative(SRC, file).split(path.sep).includes("infra")
}

function isTestFile(file: string): boolean {
  return path.relative(SRC, file).split(path.sep).includes("__tests__")
}

/**
 * "Không module nào import `PrismaClient` ngoài `infra/`" là một luật kiến trúc,
 * và luật không có test là luật sẽ trôi. Phép quét này rẻ hơn review và không
 * bao giờ quên.
 */
describe("client cơ sở dữ liệu chỉ tồn tại trong infra/", () => {
  it("không tệp nào ngoài infra/ import client", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !isInfra(file))
      .filter((file) => !isTestFile(file))
      .filter((file) => {
        const source = readFileSync(file, "utf8")
        return FORBIDDEN.some((needle) => source.includes(`from "${needle}`))
      })
      .map((file) => path.relative(SRC, file))

    expect(offenders).toEqual([])
  })

  it("có ít nhất một tệp infra/ thật sự giữ client", () => {
    const holders = sourceFiles(SRC)
      .filter(isInfra)
      .filter((file) => readFileSync(file, "utf8").includes("@/generated/prisma"))

    expect(holders.length).toBeGreaterThan(0)
  })
})
