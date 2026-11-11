import { describe, expect, it } from "vitest"

import { carryIgnores, parseGitleaksIgnore, renderGitleaksIgnore } from "../../../scripts/release/cut-gitleaks"

/** Kế hoạch bàn giao GD1, Bước 2.4: báo nhầm gitleaks đã duyệt đi theo dòng, không theo commit cũ. */
describe("mang .gitleaksignore sang bản cắt", () => {
  const ignore = [
    "# chú thích",
    "aaaaaaa:src/a.ts:generic-api-key:2",
    "bbbbbbb:src/b.ts:generic-api-key:1",
    "ccccccc:src/khong-giao.ts:generic-api-key:1",
    "dòng sai định dạng",
  ].join("\n")
  const old: Record<string, string> = {
    "aaaaaaa:src/a.ts": "x\nconst key = 'storage-key'\ny",
    "bbbbbbb:src/b.ts": "token: 'da-doi'\n",
    "ccccccc:src/khong-giao.ts": "k = 1\n",
  }
  const cut: Record<string, string> = {
    // Dòng dời xuống do có khối bị bỏ (`@release-strip`) phía trên
    "src/a.ts": "header\nx\nconst key = 'storage-key'\ny",
    "src/b.ts": "token: 'gia-tri-moi'\n",
  }

  it("đọc đúng các mục, bỏ chú thích và dòng sai định dạng", () => {
    expect(parseGitleaksIgnore(ignore)).toEqual([
      { commit: "aaaaaaa", file: "src/a.ts", rule: "generic-api-key", line: 2 },
      { commit: "bbbbbbb", file: "src/b.ts", rule: "generic-api-key", line: 1 },
      { commit: "ccccccc", file: "src/khong-giao.ts", rule: "generic-api-key", line: 1 },
    ])
  })

  it("tìm lại dòng theo nội dung; dòng đã đổi hoặc tệp không giao thì không mang sang", () => {
    const carried = carryIgnores(
      parseGitleaksIgnore(ignore),
      (commit, file) => old[`${commit}:${file}`] ?? null,
      (file) => cut[file] ?? null,
    )
    expect(carried.entries).toEqual(["src/a.ts:generic-api-key:3"])
    expect(carried.dropped).toEqual(["src/b.ts:generic-api-key:1", "src/khong-giao.ts:generic-api-key:1"])
    expect(renderGitleaksIgnore("f00d", carried.entries)).toContain("\nf00d:src/a.ts:generic-api-key:3\n")
  })
})
