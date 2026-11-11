import { beforeEach, describe, expect, it } from "vitest"
import { partnerCandidateCode, syncPartnerDispatchCandidate, type PartnerCandidateLink, type PartnerCandidateStore } from "./sync-partner-dispatch-candidate"

class FakeStore implements PartnerCandidateStore {
  link: PartnerCandidateLink | null = { partnerCode: "hn 01", partnerName: "Tiệm Hoa Cầu Giấy", address: "1 Xuân Thuỷ", province: "Hà Nội", district: null, capacityDaily: 8 }
  rows = new Map<string, { code: string; active: boolean; name: string }>()
  taken = new Set<string>()
  held: string[] = []
  async findLink() { return this.link }
  async findCandidate(_c: string, p: string) { const r = this.rows.get(p); return r ? { code: r.code } : null }
  async codeTaken(_c: string, code: string) { return this.taken.has(code) }
  async createCandidate(_c: string, p: string, code: string, link: PartnerCandidateLink) { this.rows.set(p, { code, active: true, name: link.partnerName }) }
  async setCandidateActive(_c: string, p: string, active: boolean, link: PartnerCandidateLink | null) {
    const r = this.rows.get(p)!
    r.active = active
    if (link) r.name = link.partnerName
  }
  async heldOrderCodes() { return this.held }
}

describe("cửa hàng đối tác trong vòng bắn đơn của chuỗi (D9, D7)", () => {
  let store: FakeStore
  let notices: string[]
  const run = (status: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "PENDING") =>
    syncPartnerDispatchCandidate({ chainOrgId: "chain", partnerOrgId: "partner-org-1", status }, { store, notifyStuck: async (_o, m) => { notices.push(m) } })

  beforeEach(() => {
    store = new FakeStore()
    notices = []
  })

  it("liên kết ACTIVE → tạo một ứng viên nhận đơn, chạy lại không tạo thêm", async () => {
    expect(await run("ACTIVE")).toEqual({ code: "DT-HN-01", acceptsDispatch: true, heldOrderCodes: [] })
    await run("ACTIVE")
    expect(store.rows.size).toBe(1)
  })

  it("trùng mã chi nhánh có sẵn → thêm hậu tố, không ghi đè chi nhánh của chuỗi", async () => {
    store.taken.add("DT-HN-01")
    expect((await run("ACTIVE")).code).toBe(partnerCandidateCode("hn 01", "partner-org-1", true))
  })

  it("tạm dừng → tắt nhận đơn mới; mở lại → bật lại, cập nhật tên cửa hàng", async () => {
    await run("ACTIVE")
    expect((await run("SUSPENDED")).acceptsDispatch).toBe(false)
    expect(store.rows.get("partner-org-1")?.active).toBe(false)
    store.link = { ...store.link!, partnerName: "Tiệm Hoa Mới" }
    await run("ACTIVE")
    expect(store.rows.get("partner-org-1")).toMatchObject({ active: true, name: "Tiệm Hoa Mới" })
    expect(notices).toEqual([])
  })

  it("chấm dứt khi còn giữ đơn → tắt nhận đơn và báo Điều phối kèm mã đơn", async () => {
    await run("ACTIVE")
    store.held = ["DH-1", "DH-2"]
    const res = await run("TERMINATED")
    expect(res).toMatchObject({ acceptsDispatch: false, heldOrderCodes: ["DH-1", "DH-2"] })
    expect(notices[0]).toContain("#DH-1")
  })

  it("chưa từng là ứng viên mà tạm dừng / chờ đồng ý → không tạo gì", async () => {
    expect(await run("SUSPENDED")).toEqual({ code: null, acceptsDispatch: false, heldOrderCodes: [] })
    expect(await run("PENDING")).toEqual({ code: null, acceptsDispatch: false, heldOrderCodes: [] })
    expect(store.rows.size).toBe(0)
  })
})
