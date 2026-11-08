/**
 * QUY TRÌNH TỰ ĐỘNG BÀN GIAO SẠCH (HANDOVER CLEAN TENANT PIPELINE)
 *
 * Tiêu chuẩn kỹ thuật:
 *   1. Zero Downtime: Chỉ khóa hàng (Row-level Lock) theo organization_id, không ảnh hưởng tenant khác.
 *   2. ACID Atomic Transaction: Toàn bộ quá trình xóa bọc trong 1 transaction duy nhất.
 *   3. Master Data Integrity Guard: Tự động so sánh số lượng danh mục trước và sau khi xóa.
 *      Nếu phát hiện hao hụt Master Data (sản phẩm, mẫu hoa, nhân sự) -> Tự động Rollback 100%!
 *   4. Dry-Run First: Hỗ trợ quét và thống kê số liệu trước mà không sửa đổi DB.
 *   5. Audit Trail: Ghi vết kiểm toán chuẩn vào bảng audit_logs.
 *
 * Cách dùng:
 *   • Quét thử (Dry Run):     npm run handover:clean:dry
 *   • Thực thi Siin Store:    npm run handover:clean -- --confirm
 *   • Cho shop bất kỳ:        npm run handover:clean -- --slug=<shop-slug> --confirm
 */

import { prisma } from "../src/core/tenancy/infra/prisma"
import { setPurgeReason } from "../src/core/tenancy/infra/purge-reason"
import { MOCLAN_CONSTANTS } from "../prisma/seed/dev-moclan-data"
import { createTenantHandoverBackup } from "./handover-backup-engine"

export interface HandoverCleanOptions {
  slug?: string | undefined
  orgId?: string | undefined
  dryRun?: boolean | undefined
  confirm?: boolean | undefined
  cleanTestCustomers?: boolean | undefined
}

export interface MasterBaseline {
  products: number
  variants: number
  catalogs: number
  memberships: number
  hasBusinessProfile: boolean
  hasBrandProfile: boolean
}

export interface TransactionalStats {
  orders: number
  orderItems: number
  orderPayments: number
  orderEvents: number
  orderAssignments: number
  orderCoordinations: number
  orderQcRecords: number
  orderExceptions: number
  orderInfoRequests: number
  orderChangeRequests: number
  greetingSessions: number
  greetingJourneyEvents: number
  greetingMessages: number
  greetingNotifications: number
  greetingPaymentEvents: number
  vouchersInUse: number
  testCustomers: number
}

function parseCliArgs(): HandoverCleanOptions {
  const getArg = (name: string): string | null => {
    const found = process.argv.find((arg) => arg.startsWith(`--${name}=`))
    return found ? found.slice(name.length + 3) : null
  }
  const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`)

  return {
    slug: getArg("slug") ?? undefined,
    orgId: getArg("org-id") ?? undefined,
    dryRun: hasFlag("dry-run") || hasFlag("dry"),
    confirm: hasFlag("confirm") || hasFlag("force"),
    cleanTestCustomers: hasFlag("clean-customers"),
  }
}

async function findTargetOrganization(options: HandoverCleanOptions) {
  if (options.orgId) {
    return prisma.organizations.findUnique({ where: { id: options.orgId } })
  }
  const targetSlug = options.slug || "siin-store"
  return prisma.organizations.findFirst({
    where: {
      OR: [
        { slug: targetSlug },
        { name: targetSlug },
        ...(targetSlug === "siin-store" ? [{ id: MOCLAN_CONSTANTS.ORG_ID }, { name: "Siin Store" }] : []),
      ],
    },
  })
}

async function getMasterBaseline(orgId: string): Promise<MasterBaseline> {
  const [products, variants, catalogs, memberships, bizProfile, brandProfile] = await Promise.all([
    prisma.products.count({ where: { organization_id: orgId } }),
    prisma.product_variants.count({ where: { organization_id: orgId } }),
    prisma.greeting_catalogs.count({ where: { organization_id: orgId } }),
    prisma.memberships.count({ where: { organization_id: orgId } }),
    prisma.business_profiles.findFirst({ where: { organization_id: orgId } }),
    prisma.brand_profiles.findFirst({ where: { organization_id: orgId } }),
  ])
  return {
    products,
    variants,
    catalogs,
    memberships,
    hasBusinessProfile: !!bizProfile,
    hasBrandProfile: !!brandProfile,
  }
}

async function getTransactionalStats(orgId: string): Promise<TransactionalStats> {
  const [
    orders,
    orderItems,
    orderPayments,
    orderEvents,
    orderAssignments,
    orderCoordinations,
    orderQcRecords,
    orderExceptions,
    orderInfoRequests,
    orderChangeRequests,
    greetingSessions,
    greetingJourneyEvents,
    greetingMessages,
    greetingNotifications,
    greetingPaymentEvents,
    vouchersInUse,
    testCustomers,
  ] = await Promise.all([
    prisma.orders.count({ where: { organization_id: orgId } }),
    prisma.order_items.count({ where: { organization_id: orgId } }),
    prisma.order_payments.count({ where: { organization_id: orgId } }),
    prisma.order_events.count({ where: { organization_id: orgId } }),
    prisma.order_assignments.count({ where: { organization_id: orgId } }),
    prisma.order_coordinations.count({ where: { organization_id: orgId } }),
    prisma.order_qc_records.count({ where: { organization_id: orgId } }),
    prisma.order_exceptions.count({ where: { organization_id: orgId } }),
    prisma.order_info_requests.count({ where: { organization_id: orgId } }),
    prisma.order_change_requests.count({ where: { organization_id: orgId } }),
    prisma.greeting_sessions.count({ where: { organization_id: orgId } }),
    prisma.greeting_journey_events.count({ where: { organization_id: orgId } }),
    prisma.greeting_messages.count({ where: { organization_id: orgId } }),
    prisma.greeting_notifications.count({ where: { organization_id: orgId } }),
    prisma.greeting_payment_events.count({ where: { organization_id: orgId } }),
    prisma.vouchers.count({ where: { organization_id: orgId, order_id: { not: null } } }),
    prisma.customers.count({ where: { organization_id: orgId } }),
  ])

  return {
    orders, orderItems, orderPayments, orderEvents, orderAssignments, orderCoordinations,
    orderQcRecords, orderExceptions, orderInfoRequests, orderChangeRequests,
    greetingSessions, greetingJourneyEvents, greetingMessages, greetingNotifications,
    greetingPaymentEvents, vouchersInUse, testCustomers,
  }
}

function getDbTargetInfo(): { target: string; isRemote: boolean } {
  try {
    const parsed = new URL(process.env.DATABASE_URL || "")
    const host = parsed.hostname || "localhost"
    const port = parsed.port ? `:${parsed.port}` : ""
    const dbName = parsed.pathname.replace(/^\//, "")
    const isRemote = host !== "localhost" && host !== "127.0.0.1" && host !== "::1"
    return { target: `${host}${port}/${dbName}`, isRemote }
  } catch {
    return { target: "Unknown DB", isRemote: false }
  }
}

export async function runHandoverCleanPipeline(options: HandoverCleanOptions = {}): Promise<void> {
  console.log("================================================================================")
  console.log("🚀 [FLORAOS] KHỞI ĐỘNG QUY TRÌNH BÀN GIAO SẠCH (HANDOVER CLEAN PIPELINE)")
  console.log("================================================================================")

  const dbInfo = getDbTargetInfo()
  console.log(`🌐 Máy chủ CSDL: \x1b[36m${dbInfo.target}\x1b[0m ${dbInfo.isRemote ? "\x1b[31m[REMOTE / PRODUCTION]\x1b[0m" : "\x1b[32m[LOCAL]\x1b[0m"}`)

  const org = await findTargetOrganization(options)
  if (!org) {
    console.error(`❌ LỖI: Không tìm thấy tổ chức mục tiêu: ${options.slug || options.orgId || "siin-store"}`)
    process.exit(1)
  }

  const orgId = org.id
  console.log(`🏢 Cửa hàng mục tiêu: \x1b[32m${org.name}\x1b[0m (ID: ${orgId}, Slug: ${org.slug})`)

  const baseline = await getMasterBaseline(orgId)
  console.log("\n📦 [MASTER DATA BASELINE - BẢO TOÀN TUYỆT ĐỐI]")
  console.log(`   • Sản phẩm hoa: ${baseline.products} mẫu (${baseline.variants} biến thể)`)
  console.log(`   • Mẫu thiệp / Catalog: ${baseline.catalogs} bộ`)
  console.log(`   • Tài khoản nhân sự: ${baseline.memberships} thành viên`)
  console.log(`   • Hồ sơ kinh doanh & thương hiệu: ${baseline.hasBusinessProfile && baseline.hasBrandProfile ? "Đầy đủ" : "Chưa đủ"}`)

  const stats = await getTransactionalStats(orgId)
  console.log("\n📊 [DỮ LIỆU GIAO DỊCH HIỆN CÓ]")
  console.log(`   • Đơn hàng chính (orders): ${stats.orders}`)
  console.log(`   • Chi tiết đơn & phân công: ${stats.orderItems} món, ${stats.orderAssignments} lượt thợ`)
  console.log(`   • Sổ thu thanh toán: ${stats.orderPayments} giao dịch`)
  console.log(`   • Hồ sơ QC & Sự cố: ${stats.orderQcRecords} bản ghi QC, ${stats.orderExceptions} sự cố`)
  console.log(`   • Phiên tiếp đón Thẻ Chào: ${stats.greetingSessions} phiên (${stats.greetingJourneyEvents} sự kiện)`)
  console.log(`   • Giao dịch ngân hàng Thẻ Chào: ${stats.greetingPaymentEvents}`)
  console.log(`   • Voucher đang bị gắn đơn: ${stats.vouchersInUse}`)

  if (options.dryRun) {
    console.log("\n🔎 \x1b[33m[CHẾ ĐỘ DRY-RUN] Không có dữ liệu nào bị thay đổi.\x1b[0m")
    console.log("   Tất cả các bản ghi giao dịch trên sẽ được dọn sạch khi chạy với cờ --confirm.")
    console.log("================================================================================\n")
    return
  }

  if (!options.confirm) {
    console.error("\n⚠️  CẢNH BÁO AN TOÀN:")
    console.error("   Đây là môi trường thực thi xóa dữ liệu giao dịch để bàn giao.")
    console.error("   Vui lòng thêm cờ \x1b[32m--confirm\x1b[0m để xác nhận thực thi:")
    console.error(`   👉 npm run handover:clean -- --slug=${org.slug} --confirm\n`)
    process.exit(1)
  }

  // SDAGF D-04: tổ chức đang legal hold thì không dọn — không có cờ vượt.
  if (org.legal_hold_until && org.legal_hold_until.getTime() > Date.now()) {
    console.error(`🚫 Tổ chức đang được giữ dữ liệu theo yêu cầu pháp lý tới ${org.legal_hold_until.toISOString()}.`)
    console.error("   Gỡ giữ qua console vận hành (N14) trước khi dọn.\n")
    process.exit(1)
  }

  if (stats.orders > 50 && !process.argv.includes(`--danger-override=${org.slug}`)) {
    console.error(`🚨 CẢNH BÁO: Cửa hàng có ${stats.orders} đơn (nghi vấn đang kinh doanh thật)!`)
    console.error(`   Để đảm bảo không xóa nhầm, hãy truyền: --danger-override=${org.slug}\n`)
    process.exit(1)
  }

  if (stats.orders > 0 || stats.greetingSessions > 0) {
    const backupFile = await createTenantHandoverBackup(prisma, orgId, org.slug)
    console.log(`📦 \x1b[32m[TỰ ĐỘNG SAO LƯU DỰ PHÒNG]\x1b[0m Đã lưu snapshot: ${backupFile}`)
  }

  console.log("\n⚡ [THỰC THI GIAO DỊCH NGUYÊN TỬ (ACID TRANSACTION)] Đang dọn dẹp an toàn...")

  await prisma.$transaction(
    async (tx) => {
      // Nhật ký bất biến (ADR-013 D-I4): xoá order_events và xoá dây chuyền từ orders cần lý do purge trong giao dịch
      await setPurgeReason(tx, "tenant_offboarding")

      // 1. Dọn dẹp Thẻ Chào (Greeting Card)
      await tx.greeting_journey_events.deleteMany({ where: { organization_id: orgId } })
      await tx.greeting_message_reads.deleteMany({ where: { organization_id: orgId } })
      await tx.greeting_messages.deleteMany({ where: { organization_id: orgId } })
      await tx.greeting_notifications.deleteMany({ where: { organization_id: orgId } })
      await tx.greeting_payment_events.deleteMany({ where: { organization_id: orgId } })

      await tx.greeting_catalog_events.updateMany({
        where: { organization_id: orgId, order_id: { not: null } },
        data: { order_id: null },
      })

      await tx.greeting_sessions.deleteMany({ where: { organization_id: orgId } })

      // 2. Dọn dẹp Đơn hàng (Orders & Sub-tables)
      await tx.order_items.deleteMany({ where: { organization_id: orgId } })
      await tx.order_assignments.deleteMany({ where: { organization_id: orgId } })
      await tx.order_events.deleteMany({ where: { organization_id: orgId } })
      await tx.order_coordinations.deleteMany({ where: { organization_id: orgId } })
      await tx.order_qc_records.deleteMany({ where: { organization_id: orgId } })
      await tx.order_exceptions.deleteMany({ where: { organization_id: orgId } })
      await tx.order_payments.deleteMany({ where: { organization_id: orgId } })
      await tx.order_info_requests.deleteMany({ where: { organization_id: orgId } })
      await tx.order_change_requests.deleteMany({ where: { organization_id: orgId } })

      // 3. Hoàn nguyên Voucher
      await tx.vouchers.updateMany({
        where: { organization_id: orgId, order_id: { not: null } },
        data: { order_id: null, is_used: false, used_at: null },
      })

      // 4. Xóa bảng đơn hàng chính
      await tx.orders.deleteMany({ where: { organization_id: orgId } })

      // 5. Tùy chọn dọn khách hàng test
      if (options.cleanTestCustomers) {
        await tx.customers.deleteMany({ where: { organization_id: orgId } })
      }

      // 6. CHỐT CHẶN AN TOÀN: Kiểm tra bảo toàn Master Data
      const postProducts = await tx.products.count({ where: { organization_id: orgId } })
      const postMemberships = await tx.memberships.count({ where: { organization_id: orgId } })
      const postCatalogs = await tx.greeting_catalogs.count({ where: { organization_id: orgId } })

      if (postProducts < baseline.products || postMemberships < baseline.memberships || postCatalogs < baseline.catalogs) {
        throw new Error("🚨 BẢO VỆ DỮ LIỆU: Phát hiện Master Data bị hao hụt! Tự động ROLLBACK toàn bộ giao dịch!")
      }

      // 7. Ghi Audit Log chuẩn SaaS
      await tx.audit_logs.create({
        data: {
          organization_id: orgId,
          user_id: "system-handover",
          action: "handover.clean_tenant",
          entity_type: "organizations",
          entity_id: orgId,
          before: {
            orders: stats.orders,
            payments: stats.orderPayments,
            sessions: stats.greetingSessions,
          },
          after: {
            orders: 0,
            payments: 0,
            sessions: 0,
            status: "CLEAN_HANDOVER_READY",
          },
        },
      })
    },
    { timeout: 30000 }
  )

  console.log("   ✓ Giao dịch Transaction hoàn tất thành công 100%.")

  // Kiểm định hậu kỳ (Post-Verification)
  const verifyStats = await getTransactionalStats(orgId)
  const isPerfect =
    verifyStats.orders === 0 &&
    verifyStats.orderItems === 0 &&
    verifyStats.orderPayments === 0 &&
    verifyStats.greetingSessions === 0 &&
    verifyStats.vouchersInUse === 0

  console.log("\n================================================================================")
  console.log("📋 [BIÊN BẢN NGHIỆM THU KỸ THUẬT BÀN GIAO (HANDOVER SIGN-OFF)]")
  console.log("================================================================================")
  console.log(` • Đơn hàng còn lại:            ${verifyStats.orders === 0 ? "✅ 0 [PASS]" : "❌ LỖI"}`)
  console.log(` • Chi tiết đơn còn lại:        ${verifyStats.orderItems === 0 ? "✅ 0 [PASS]" : "❌ LỖI"}`)
  console.log(` • Sổ thu thanh toán:           ${verifyStats.orderPayments === 0 ? "✅ 0 [PASS]" : "❌ LỖI"}`)
  console.log(` • Phiên tiếp đón Thẻ Chào:     ${verifyStats.greetingSessions === 0 ? "✅ 0 [PASS]" : "❌ LỖI"}`)
  console.log(` • Voucher bị khóa:             ${verifyStats.vouchersInUse === 0 ? "✅ 0 [PASS]" : "❌ LỖI"}`)
  console.log(` • Danh mục hoa bảo toàn:       ${baseline.products > 0 ? `✅ ${baseline.products} mẫu [PASS]` : "⚠️ 0"}`)
  console.log(` • Tài khoản nhân sự bảo toàn:  ${baseline.memberships > 0 ? `✅ ${baseline.memberships} người [PASS]` : "⚠️ 0"}`)
  console.log("--------------------------------------------------------------------------------")

  if (isPerfect) {
    console.log("🎉 \x1b[32mTRẠNG THÁI: BÀN GIAO HOÀN HẢO (100% CLEAN - READY FOR HANDOVER)\x1b[0m")
  } else {
    console.warn("⚠️  TRẠNG THÁI: Có một số bảng chưa sạch hoàn toàn. Vui lòng kiểm tra lại.")
  }
  console.log("================================================================================\n")
}

if (process.argv[1]?.endsWith("handover-clean-tenant.ts") || process.argv[1]?.endsWith("handover-clean-tenant.js")) {
  const options = parseCliArgs()
  runHandoverCleanPipeline(options)
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error("\n❌ [PIPELINE ERROR]:", err)
      await prisma.$disconnect()
      process.exit(1)
    })
}
