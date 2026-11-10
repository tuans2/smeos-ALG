import { prisma } from "../src/core/tenancy/infra/prisma"
import { CHAIN_LINK_TYPES } from "../src/modules/organization/infra/organization-links"
import { applyPartnerLinkEffects } from "../src/modules/chain-partnership/use-cases/partner-link-effects"
import { partnerRoomKey } from "../src/modules/internal-chat/domain/conversation-access-policy"

// Kế hoạch chat nội bộ IC-2.3 / IC-3.2: mỗi liên kết chuỗi → cửa hàng đang hiệu lực có một phòng trao đổi và (khi
// ACTIVE) một dòng ứng viên bắn đơn. Mặc định CHẠY THỬ — chỉ đếm việc sẽ làm; thêm `--apply` mới ghi. Chạy lại an
// toàn (phòng theo khoá chống trùng, ứng viên theo `partner_org_id` duy nhất).
//
//   npm run chat:backfill-rooms                 # chạy thử
//   npm run chat:backfill-rooms -- --apply      # ghi
//
// Phải chạy qua lệnh npm (có `--conditions=react-server`): chuỗi import chạm `server-only` (luồng sự kiện phòng →
// redis-client), gọi `npx tsx` trần sẽ ném lỗi ngay khi nạp.
//
// Chỉ in id tổ chức (UUID) và số đếm — không in tên, SĐT, địa chỉ.
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply")
  const links = await prisma.organization_links.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED"] }, link_type: { in: [...CHAIN_LINK_TYPES] } },
    select: { parent_org_id: true, child_org_id: true, status: true, partner_code: true, child_organization: { select: { name: true } }, parent_organization: { select: { memberships: { where: { status: "ACTIVE" }, select: { user_id: true }, take: 1, orderBy: { joined_at: "asc" } } } } },
  })

  let missingRooms = 0
  let missingCandidates = 0
  for (const link of links) {
    const room = await prisma.internal_chat_conversations.findFirst({ where: { organization_id: link.parent_org_id, room_key: partnerRoomKey(link.child_org_id) }, select: { id: true } })
    const candidate = await prisma.branches.findFirst({ where: { organization_id: link.parent_org_id, partner_org_id: link.child_org_id }, select: { id: true } })
    if (!room) missingRooms += 1
    if (!candidate && link.status === "ACTIVE") missingCandidates += 1
    if (!apply || (room && (candidate || link.status !== "ACTIVE"))) continue
    const actor = link.parent_organization.memberships[0]?.user_id
    if (!actor) {
      console.log(`Bỏ qua chuỗi ${link.parent_org_id}: không có thành viên đang hoạt động để ghi người tạo phòng`)
      continue
    }
    await applyPartnerLinkEffects({
      chainOrgId: link.parent_org_id,
      partnerOrgId: link.child_org_id,
      status: link.status,
      actorUserId: actor,
      roomTitle: `Trao đổi: ${link.child_organization.name} (${link.partner_code})`,
    })
  }

  console.log(`Liên kết hiệu lực: ${links.length} · thiếu phòng: ${missingRooms} · thiếu ứng viên bắn đơn: ${missingCandidates}`)
  console.log(apply ? "Đã ghi. Chạy lại để kiểm: hai số thiếu phải về 0." : "Chạy thử — chưa ghi gì. Thêm --apply để ghi.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
