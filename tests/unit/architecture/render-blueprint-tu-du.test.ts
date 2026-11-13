import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Blueprint Render của bản giao phải TỰ ĐỦ: "New → Blueprint, trỏ vào repo" là xong,
 * không còn bước tay nào trên Render hay GitHub để deploy chạy được.
 *
 * Test này khoá bốn điều kiện làm nên tính tự đủ đó. `render.yaml` được đọc dưới dạng văn bản
 * (repo không có thư viện YAML cho Node, thêm dependency cần PO duyệt — CLAUDE.md).
 */
const ROOT = path.resolve(__dirname, "../../..")
const BLUEPRINT = readFileSync(path.join(ROOT, "render.yaml"), "utf8")
const CI = readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8")

/** Cắt `render.yaml` thành từng khối dịch vụ theo dòng `  - type: <loại>`. */
function serviceBlocks(): { type: string; name: string; body: string }[] {
  const lines = BLUEPRINT.split("\n")
  const starts: number[] = []
  lines.forEach((line, index) => {
    if (/^ {2}- type: \S+/.test(line)) starts.push(index)
  })
  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1]! : lines.length
    const body = lines.slice(start, end).join("\n")
    return {
      type: /- type: (\S+)/.exec(body)![1]!,
      name: /\n\s+name: (\S+)/.exec(body)?.[1] ?? "(không tên)",
      body,
    }
  })
}

const SERVICES = serviceBlocks()
/** Dịch vụ deploy từ mã nguồn — keyvalue/database không build nên không có `autoDeploy`. */
const DEPLOYABLE = SERVICES.filter((service) => ["web", "worker", "cron"].includes(service.type))

describe("render.yaml — blueprint tự đủ", () => {
  it("có đủ 4 dịch vụ deploy từ mã + keyvalue + database", () => {
    expect(DEPLOYABLE.map((service) => service.name).sort()).toEqual([
      "smeos-cron-dispatch-sweep",
      "smeos-web",
      "smeos-worker-media",
      "smeos-worker-vision",
    ])
    expect(BLUEPRINT).toMatch(/- type: keyvalue/)
    expect(BLUEPRINT).toMatch(/\ndatabases:\n/)
  })

  // Hai điều kiện của yêu cầu PO gộp vào một dòng YAML:
  //   `autoDeployTrigger: checksPass` → blueprint là đủ (không cần deploy hook) VÀ chỉ deploy
  //   commit đã có check CI xanh (giữ P0-02/D-14). `commit` hay `off` đều phá một trong hai.
  it.each(DEPLOYABLE.map((service) => [service.name, service] as const))(
    "%s tự deploy từ main nhưng chỉ khi CI xanh (autoDeployTrigger: checksPass)",
    (_name, service) => {
      expect(service.body).toMatch(/\n\s+autoDeployTrigger: checksPass\b/)
      expect(service.body).toMatch(/\n\s+branch: main\b/)
      // `autoDeploy` là trường cũ đã bị thay; để lẫn cả hai là nhập nhằng.
      expect(service.body).not.toMatch(/\n\s+autoDeploy:/)
    }
  )

  it("ghim runtime theo CI: Node 22 cho dịch vụ node, Python 3.11 cho worker", () => {
    for (const service of DEPLOYABLE.filter((s) => /runtime: node/.test(s.body) || s.type === "cron")) {
      expect(service.body, `${service.name} thiếu NODE_VERSION`).toMatch(
        /- key: NODE_VERSION\n\s+value: "22/
      )
    }
    for (const service of DEPLOYABLE.filter((s) => /runtime: python/.test(s.body))) {
      expect(service.body, `${service.name} thiếu PYTHON_VERSION`).toMatch(
        /- key: PYTHON_VERSION\n\s+value: "3\.11/
      )
    }
    // Ghim hai đường: biến `PYTHON_VERSION` và tệp `.python-version` trong `rootDir: workers`.
    // Render đọc đường nào cũng ra 3.11, không phụ thuộc vào việc nó ưu tiên cái nào.
    expect(readFileSync(path.join(ROOT, "workers/.python-version"), "utf8").trim()).toMatch(
      /^3\.11/
    )
  })
})

describe("render.yaml — không còn biến bắt buộc phải điền tay", () => {
  const web = DEPLOYABLE.find((service) => service.name === "smeos-web")!

  /** Bốn biến `src/lib/env.ts` bắt buộc: thiếu một biến là app không khởi động. */
  it.each([
    ["DATABASE_URL", /- key: DATABASE_URL\n\s+fromDatabase:/],
    ["SESSION_SECRET", /- key: SESSION_SECRET\n\s+generateValue: true/],
    ["SSO_SESSION_SECRET", /- key: SSO_SESSION_SECRET\n\s+generateValue: true/],
    ["INTEGRATION_TOKEN_SECRET", /- key: INTEGRATION_TOKEN_SECRET\n\s+generateValue: true/],
  ])("%s do Render tự cấp, không phải sync: false", (_key, pattern) => {
    expect(web.body).toMatch(pattern)
  })

  it("CRON_SECRET sinh ở web và cron lấy lại đúng giá trị đó", () => {
    expect(web.body).toMatch(/- key: CRON_SECRET\n\s+generateValue: true/)
    const cron = DEPLOYABLE.find((service) => service.type === "cron")!
    expect(cron.body).toMatch(
      /- key: CRON_SECRET\n\s+fromService:\n\s+type: web\n\s+name: smeos-web\n\s+envVarKey: CRON_SECRET/
    )
  })

  it("không đặt NEXT_PUBLIC_APP_ENV: khoá \"Sắp ra mắt\" của bản đầy đủ sẽ khoá nhầm chức năng đã giao", () => {
    expect(BLUEPRINT).not.toMatch(/- key: NEXT_PUBLIC_APP_ENV\b/)
  })

  it("`next build` của web có heap 4 GB (build cần hơn 2 GB; máy build Starter 8 GB RAM)", () => {
    const build = /\n\s+buildCommand: (.+)/.exec(web.body)?.[1] ?? ""
    expect(build).toMatch(/NODE_OPTIONS=--max-old-space-size=4096 npm run build$/)
  })

  it("khai PORT khớp `next start -p` để health check gọi đúng cổng", () => {
    const start = /"start": "next start -p (\d+)"/.exec(
      readFileSync(path.join(ROOT, "package.json"), "utf8")
    )
    expect(start, "package.json không còn script start dạng `next start -p <cổng>`").not.toBeNull()
    expect(web.body).toMatch(new RegExp(`- key: PORT\\n\\s+value: "${start![1]}"`))
  })
})

describe("CI không còn đường deploy riêng", () => {
  it("không có job `deploy` và không đọc secret RENDER_DEPLOY_HOOK_*", () => {
    expect(CI).not.toMatch(/^ {2}deploy:$/m)
    expect(CI).not.toMatch(/secrets\.RENDER_DEPLOY_HOOK/)
  })
})
