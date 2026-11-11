import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkChatImage, isRoomImageKey, MAX_CHAT_IMAGE_BYTES } from "../domain/chat-image"
import { ChatAccessDeniedError, ChatImageTooLargeError, InvalidMessageContentError } from "../domain/errors"
import { chatImageDecorator } from "../infra/chat-image-decorator"
import { ensurePartnerConversation } from "./ensure-room"
import { sendChatImages } from "./send-chat-images"
import { FakeLinkPolicy, InMemoryChatRepository } from "./__tests__/in-memory-chat-repo"

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const FAKE = new TextEncoder().encode("<svg onload=alert(1)>")
const PARTNER = { userId: "partner-user", organizationId: "partner-org", branchId: null }

describe("ảnh trong tin nhắn trao đổi nội bộ (GĐ8)", () => {
  let repo: InMemoryChatRepository
  let links: FakeLinkPolicy
  let put: ReturnType<typeof vi.fn<(key: string, body: Uint8Array, contentType: string) => Promise<void>>>
  let roomId: string
  let ids: number
  const deps = () => ({ chatRepo: repo, linkPolicy: links, storage: { put }, newId: () => `id-${++ids}` })
  const send = (files: Uint8Array[], caption = "", caller = PARTNER) => sendChatImages(deps(), { conversationId: roomId, caller, userRole: "cua_hang", caption, files })

  beforeEach(async () => {
    repo = new InMemoryChatRepository()
    links = new FakeLinkPolicy()
    put = vi.fn<(key: string, body: Uint8Array, contentType: string) => Promise<void>>().mockResolvedValue(undefined)
    ids = 0
    roomId = (await ensurePartnerConversation(repo, { chainOrgId: "chain-org", partnerOrgId: "partner-org", title: "x", createdBy: "u" })).id
  })

  it("nhận dạng theo byte thật: JPG/PNG nhận, tệp giả đuôi ảnh và quá 10 MB bị chặn", () => {
    expect(checkChatImage(JPG)).toMatchObject({ ok: true, ext: "jpg" })
    expect(checkChatImage(PNG)).toMatchObject({ ok: true, ext: "png" })
    expect(checkChatImage(FAKE)).toEqual({ ok: false, reason: "unsupported_type" })
    expect(checkChatImage(new Uint8Array(0))).toEqual({ ok: false, reason: "empty" })
    const big = new Uint8Array(MAX_CHAT_IMAGE_BYTES + 1)
    big.set(JPG)
    expect(checkChatImage(big)).toEqual({ ok: false, reason: "too_large" })
  })

  it("lưu dưới thư mục ảnh của phòng thuộc tổ chức chủ phòng, tạo một tin ảnh kèm chú thích", async () => {
    const msg = await send([JPG, PNG], " Mẫu hoa hồng ")
    expect(put.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      [`org/chain-org/chat-${roomId}/id-1.jpg`, "image/jpeg"],
      [`org/chain-org/chat-${roomId}/id-2.png`, "image/png"],
    ])
    expect(msg).toMatchObject({ messageType: "IMAGE", content: "Mẫu hoa hồng", attachments: [`org/chain-org/chat-${roomId}/id-1.jpg`, `org/chain-org/chat-${roomId}/id-2.png`] })
  })

  it("một tệp sai là không ghi tệp nào; quá 5 ảnh, không có ảnh, quá lớn đều bị chặn", async () => {
    await expect(send([JPG, FAKE])).rejects.toThrow(InvalidMessageContentError)
    await expect(send([JPG, JPG, JPG, JPG, JPG, JPG])).rejects.toThrow(InvalidMessageContentError)
    await expect(send([])).rejects.toThrow(InvalidMessageContentError)
    const big = new Uint8Array(MAX_CHAT_IMAGE_BYTES + 1)
    big.set(JPG)
    await expect(send([big])).rejects.toThrow(ChatImageTooLargeError)
    expect(put).not.toHaveBeenCalled()
    expect(repo.messages).toHaveLength(0)
  })

  it("không vào được phòng / liên kết tạm dừng → 404, không ghi tệp", async () => {
    await expect(send([JPG], "", { userId: "x", organizationId: "third-org", branchId: null })).rejects.toThrow(ChatAccessDeniedError)
    links.state = "SUSPENDED"
    await expect(send([JPG])).rejects.toThrow(ChatAccessDeniedError)
    expect(put).not.toHaveBeenCalled()
  })

  it("đọc: chỉ ký URL cho khoá đúng thư mục ảnh của phòng, khoá lạ bị bỏ", async () => {
    const room = { id: roomId, organizationId: "chain-org" }
    expect(isRoomImageKey(`org/chain-org/chat-${roomId}/a.jpg`, room)).toBe(true)
    expect(isRoomImageKey(`org/chain-org/chat-khac/a.jpg`, room)).toBe(false)
    expect(isRoomImageKey(`org/other-org/chat-${roomId}/a.jpg`, room)).toBe(false)
    expect(isRoomImageKey(`org/chain-org/chat-${roomId}/../x/a.jpg`, room)).toBe(false)

    const msg = await send([JPG])
    msg.attachments = [...msg.attachments, "org/other-org/unfiled/bi-mat.jpg"]
    const signedUrl = vi.fn(async (key: string) => `/api/v1/storage/${key}?sig=1`)
    const conv = (await repo.findConversationById(roomId))!
    const [out] = await chatImageDecorator({ signedUrl })([msg], conv, PARTNER)
    expect(out!.attachments).toEqual([`/api/v1/storage/org/chain-org/chat-${roomId}/id-1.jpg?sig=1`])
    expect(signedUrl).toHaveBeenCalledWith(`org/chain-org/chat-${roomId}/id-1.jpg`, 3600, "GET")
  })
})
