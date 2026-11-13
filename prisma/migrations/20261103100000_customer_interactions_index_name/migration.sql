-- Tên index do migration 20261101190000 tự đặt (cắt ở 63 ký tự) khác tên Prisma sinh, làm `prisma migrate diff` luôn lệch.
-- RenameIndex
ALTER INDEX "customer_interactions_organization_id_customer_id_occurred_at_i" RENAME TO "customer_interactions_organization_id_customer_id_occurred__idx";
