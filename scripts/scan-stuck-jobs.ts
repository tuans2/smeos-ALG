import { prisma } from "../src/core/tenancy/infra/prisma"
import { scanStuckJobs } from "../src/modules/jobs/use-cases/scan-stuck-jobs"

// `YC-J10`. Chạy định kỳ ngoài request HTTP — ví dụ cron mỗi 5 phút (dòng
// crontab, KHÔNG đặt trong khối /** */ — "*" liền "/" đóng khối sớm):
//
//   (mỗi-5-phút) cd /path/floraos-core && npm run quet-job-treo
//
// Không có tiến trình này thì một worker chết để lại job treo vĩnh viễn ở
// `PROCESSING` (đặc tả 05 mục 7).
async function main(): Promise<void> {
  const count = await scanStuckJobs()
  if (count > 0) console.log(`Đánh dấu FAILED ${count} job treo quá 15 phút`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
