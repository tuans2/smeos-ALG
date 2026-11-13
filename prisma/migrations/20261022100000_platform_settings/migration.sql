-- Cấu hình cấp nền tảng (rà soát M13, 22/10/2026): ma trận điều hướng theo ngành chuyển từ
-- tệp trên máy chủ (mất khi deploy, không có tác dụng với menu) vào CSDL.
-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);
