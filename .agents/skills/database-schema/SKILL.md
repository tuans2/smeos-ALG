---
name: database-schema
description: >-
  Quy tắc làm việc với Prisma schema và database cho ALG. Kích hoạt khi
  agent cần sửa prisma/schema.prisma, tạo migration, thay đổi data model,
  hoặc làm việc trực tiếp với PostgreSQL.
---

# Database & Prisma Schema — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (copy-paste)

### Thêm bảng mới (checklist)
```
1. Thêm model vào prisma/schema.prisma — BẮT BUỘC có organization_id
2. npx prisma generate
3. npx prisma migrate dev --name <ten_thay_doi> — sinh migration trong prisma/migrations/ và commit CÙNG schema. Production chạy `npm run db:deploy` (`prisma migrate deploy`, xem docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md); CI đỏ nếu schema đổi mà thiếu migration. Đổi tên/xoá cột: đọc kỹ SQL sinh ra — Prisma xoá rồi tạo lại cột, mất dữ liệu
4. Tạo repository tại src/modules/<module>/infra/<table>-repository.ts
5. Dùng scopedWhere(ctx) + scopedData(ctx, data)
6. Viết tenant test tại tests/tenant/<resource>.test.ts
7. npm run test:tenant → PHẢI xanh
```

### Model mẫu
```prisma
model my_table {
  id              String   @id @default(uuid())
  organization_id String
  name            String
  status          String   @default("DRAFT")
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id])

  @@index([organization_id])
}
```

---

## Rules (bắt buộc)

### 1. Tenant — organization_id bắt buộc
- Mọi bảng **thuộc tenant** PHẢI có `organization_id` — kể cả bảng tra cứu và demo workspace.
- Ngoại lệ duy nhất: bảng **cấp nền tảng** (sổ đăng ký dùng chung, không phải dữ liệu của một tiệm — vd `ai_models`, `ai_capabilities`, `field_definitions`, `platform_operators`, `decision_registry`; 24/83 bảng lúc rà 05/10/2026). Thêm bảng loại này phải ghi lý do ở đặc tả 07.
- Kiểm ở tầng repository (scopedWhere/scopedData), không ở route.
- **Không tạo bảng trước khi P1 (tenant) và P2 (RBAC) đạt nghiệm thu.**

### 2. Schema Conventions
- Lược đồ: `snake_case` tiếng Anh. Không PascalCase, không tiếng Việt.
- Schema file: `prisma/schema.prisma` (~105KB, 83 model). Id mặc định `@default(uuid())`.
- Mỗi bảng tenant có `@@index([organization_id])` hoặc index ghép BẮT ĐẦU bằng `organization_id`.

### 3. Quy trình sửa schema
1. Sửa `prisma/schema.prisma`
2. `npx prisma migrate dev --name <ten_thay_doi>` (dev — sinh migration và generate; hook `.claude/hooks/guard-bash.mjs` hỏi lại nếu `DATABASE_URL` không phải máy cục bộ). Đọc SQL sinh ra trước khi commit
3. CSDL `*_test` vẫn dùng `npx prisma db push` (`npm run db:test:setup`)
4. `npx prisma db seed` nếu cần
5. **⚠️ DỪNG LẠI HỎI USER trước khi sửa schema.**

### 4. Docker & PostgreSQL
- Container: `floraos-core-db`, credentials: `floraos:floraos@localhost:5432/floraos`.
- `pg_cron` cần Docker custom image: `docker/postgres-pgcron.Dockerfile`.
- DB test: `floraos_test`, setup: `npm run db:test:setup`.

---

## DO / DON'T

### ❌ DON'T — Bảng không có organization_id
```prisma
model settings {
  id    String @id
  key   String
  value String
}
```

### ✅ DO — Luôn có organization_id + index
```prisma
model settings {
  id              String @id @default(uuid())
  organization_id String
  key             String
  value           String

  organization organizations @relation(fields: [organization_id], references: [id])
  @@index([organization_id])
  @@unique([organization_id, key])
}
```

### ❌ DON'T — Query không scope tenant
```typescript
const items = await db.myTable.findMany({ where: { status: "ACTIVE" } })
```

### ✅ DO — Luôn scope qua tenant context
```typescript
const items = await db.myTable.findMany({
  where: scopedWhere(ctx, { status: "ACTIVE" }),
})
```

---

## Reference Files

| Pattern | File |
|---|---|
| Prisma schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` |
| Seed script | `prisma/seed.ts` |
| Tenant context | `src/core/tenancy/tenant-context.ts` |
| Tenant context test | `src/core/tenancy/tenant-context.test.ts` |
| Docker Postgres | `docker-compose.yml` |
| DB test setup | `scripts/dung-db-test.sh` |

## Gotchas

1. **Schema ~105KB** — `npx prisma generate` mất thời gian. Không chạy liên tục.
2. **`exactOptionalPropertyTypes: true`** — Không gán `undefined`. Bỏ key hoặc dùng `T | undefined`.
3. **Migration đã chạy** — KHÔNG sửa tay file trong `prisma/migrations/`.
4. **Index** — Mọi bảng tenant có index dẫn đầu bằng `organization_id`. Query thường xuyên → thêm composite index.
5. **Khoá ghép tenant** (05/11/2026) — bảng con như `order_events`, `order_payments`, `product_variants`, `job_events` trỏ về `(cha_id, organization_id)`. Khi tạo lồng (`order: { … events: { create: … } }`) KHÔNG truyền `organization_id` trong khối con — Prisma tự lấy từ cha. Bảng mới có cha thuộc tenant: dùng cùng cách, cha thêm `@@unique([id, organization_id])`.
6. **Timestamptz** — mọi cột `DateTime` khai `@db.Timestamptz(3)`; cột mới cũng vậy.

> Xem thêm: skill `api-development` §7 cho tenant trong use-case. Skill `testing` §4 cho tenant test.
