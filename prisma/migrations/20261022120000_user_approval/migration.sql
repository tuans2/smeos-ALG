-- Duyệt tài khoản tự đăng ký (PO 22/10/2026). Cột mới mặc định APPROVED: tài khoản có sẵn giữ
-- nguyên quyền đăng nhập; chỉ đăng ký mới qua `/auth/signup` và `/auth/instant-trial` vào PENDING.
-- CreateEnum
CREATE TYPE "user_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approval_decided_at" TIMESTAMP(3),
ADD COLUMN     "approval_decided_by" TEXT,
ADD COLUMN     "approval_status" "user_approval_status" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "users_approval_status_created_at_idx" ON "users"("approval_status", "created_at");
