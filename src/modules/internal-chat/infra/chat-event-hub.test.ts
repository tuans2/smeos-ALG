import { afterEach, describe, expect, it } from "vitest"
import { eventVisibleTo, parseChatRoomEvent, type ChatRoomEvent } from "../domain/chat-room-event"
import { ChatEventHub } from "./chat-event-hub"

const partnerRoom: ChatRoomEvent = { conversationId: "r1", organizationId: "chain", counterpartOrgId: "store", branchId: null }
const branchRoom: ChatRoomEvent = { conversationId: "r2", organizationId: "chain", counterpartOrgId: null, branchId: "b1" }

describe("sự kiện phòng cho SSE", () => {
  const saved = process.env["REDIS_URL"]
  afterEach(() => {
    if (saved === undefined) delete process.env["REDIS_URL"]
    else process.env["REDIS_URL"] = saved
  })

  it("chỉ tổ chức chủ phòng và bên kia nhận; nhân viên chi nhánh khác không nhận phòng chi nhánh", () => {
    expect(eventVisibleTo(partnerRoom, { organizationId: "chain", branchId: null })).toBe(true)
    expect(eventVisibleTo(partnerRoom, { organizationId: "store", branchId: null })).toBe(true)
    expect(eventVisibleTo(partnerRoom, { organizationId: "third", branchId: null })).toBe(false)
    expect(eventVisibleTo(branchRoom, { organizationId: "chain", branchId: "b1" })).toBe(true)
    expect(eventVisibleTo(branchRoom, { organizationId: "chain", branchId: "b2" })).toBe(false)
    expect(eventVisibleTo(branchRoom, { organizationId: "chain", branchId: null })).toBe(true)
  })

  it("không có Redis: phát trong tiến trình tới đúng người nghe của hai tổ chức; gỡ người nghe thì thôi nhận", async () => {
    delete process.env["REDIS_URL"]
    const hub = new ChatEventHub()
    const got: string[] = []
    const offChain = hub.subscribe("chain", (e) => got.push(`chain:${e.conversationId}`))
    hub.subscribe("store", (e) => got.push(`store:${e.conversationId}`))
    hub.subscribe("third", (e) => got.push(`third:${e.conversationId}`))
    await hub.publish(partnerRoom)
    offChain()
    await hub.publish(partnerRoom)
    expect(got).toEqual(["chain:r1", "store:r1", "store:r1"])
  })

  it("đọc sự kiện từ Redis: chuỗi hỏng bị bỏ", () => {
    expect(parseChatRoomEvent(JSON.stringify(partnerRoom))).toEqual(partnerRoom)
    expect(parseChatRoomEvent("{không phải json")).toBeNull()
    expect(parseChatRoomEvent(JSON.stringify({ conversationId: 1 }))).toBeNull()
  })
})
