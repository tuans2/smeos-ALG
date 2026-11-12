import { prisma } from "@/core/tenancy/infra/prisma"
import { refundFinishedJobs } from "@/modules/usage/use-cases/refund-finished-jobs"

// Hoàn credit cho lượt chạy khách không nhận được kết quả — ba diện ở
// `usage/domain/refund-policy.ts`: Guard từ chối, bị huỷ, lỗi kỹ thuật.
// Cron 5 phút đã chạy lượt này trong /api/v1/internal/integrations-sweep; lệnh này để chạy bằng tay (dòng crontab,
// KHÔNG đặt trong khối /** */ — "*" liền "/" đóng khối sớm):
//
//   (mỗi-5-phút) cd /path/floraos-core && npm run hoan-credit
//
// Vì sao là tiến trình quét chứ không phải worker tự hoàn: `YC-U4` — worker
// KHÔNG BAO GIỜ ghi `usage`. Hạn mức và credit là việc của core. Hệ quả:
// hoàn credit nhất quán sau một khoảng, không tức thì.
//
// An toàn chạy lại: `refundJob` idempotent theo dòng `usage` `REFUNDED`
// của chính job đó.

const SO_JOB_MOI_LUOT = 200

async function main(): Promise<void> {
  const { refunds, refundedJobs, refundedCredit } = await refundFinishedJobs(SO_JOB_MOI_LUOT)
  for (const r of refunds) console.log(`Hoàn ${r.credit} credit cho job ${r.jobId} (tổ chức ${r.organizationId}, diện ${r.reason})`)
  if (refundedJobs > 0) console.log(`Đã hoàn ${refundedCredit} credit cho ${refundedJobs} lượt chạy`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
