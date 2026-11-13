-- Checklist ALG 2.3: trạng thái Tạm ngưng cho mẫu sản phẩm
ALTER TYPE "product_status" ADD VALUE IF NOT EXISTS 'PAUSED' BEFORE 'ARCHIVED';
