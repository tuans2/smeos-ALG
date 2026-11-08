---
name: api-development
description: >-
  Quy tắc phát triển API backend cho FloraOS. Kích hoạt khi agent tạo/sửa
  API route, use-case, repository, error handling, hoặc bất kỳ file nào
  trong src/app/api/ hoặc src/modules/*/use-cases/.
---

> **Cập nhật 30/10/2026 — đọc trước.** Bảo mật/phân quyền/audit: `.agents/standards/smeos/05-security-authz.md` (capability + `route-capability-guard.test.ts`, `safe-remote-url`, `safeImageSrc`, chữ ký webhook, `secret-box`, rate limit, audit xuất dữ liệu). Kho tệp: skill `storage`. Ma trận quản trị / khoá công cụ: skill `tier-governance`.


# API Development — FloraOS

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (copy-paste)

### Tạo API route (route MỚI — chuẩn API Contract v1.1, PO chốt 07/11/2026)
```typescript
// src/app/api/v1/<resource>/route.ts
import { z } from "zod"
import { defineRoute } from "@/core/http/define-route"
import { created, page } from "@/core/http/contract-responses"
import { pageQuery, toPage } from "@/core/http/pagination"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  query: z.object({ ...pageQuery, status: z.enum(["ACTIVE", "ARCHIVED"]).optional() }),
  handler: async ({ ctx, query }) => {
    const rows = await listItems(ctx, { take: query.limit + 1, cursor: query.cursor, status: query.status })
    return page(toPage(rows, query.limit)) // { data, next_cursor }
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L2" },
  rateLimit: { scope: "item-create", limit: 30, windowMs: 60_000, per: "user" },
  body: z.object({ display_name: z.string().trim().min(1).max(120) }), // snake_case — sai là ném lúc nạp
  handler: async ({ ctx, body }) => created(await createItem(ctx, body)),
})
```
- `auth`: `tenant` (mã năng lực, hoặc `capability: null` + `reason` cho dữ liệu của chính mình), `platform`, `integration`, `public` (bắt buộc `rateLimit` theo IP), `cron`, `custom` (webhook/URL ký, kèm `reason`).
- Tạo job / trừ credit: `idempotency: "required"` → handler nhận `idempotencyKey`; trả `accepted({ job_id, status })` (202).
- Thành công `{ data }` / `{ data, next_cursor }`; lỗi vẫn ném `AppError`. Cấm `NextResponse.json`, `{ success }`, `{ ok }`, `{ error: "chuỗi" }` — `tests/unit/architecture/route-contract-ratchet.test.ts` chặn.
- Route cũ (có trước 07/11/2026) nằm trong `tests/unit/architecture/route-contract-legacy.txt`; sửa route cũ thì nên chuyển sang `defineRoute` và xoá dòng — chỉ khi không đổi hợp đồng client đang dùng.

### Route cũ — mẫu `handle()` (chỉ khi sửa route có sẵn)
```typescript
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L1")
  return jsonResponse(await myUseCase(ctx))
})
```

### Tạo use-case
```typescript
// src/modules/<module>/use-cases/<action>.ts
import type { TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { MyRepository } from "@/modules/<module>/infra/my-repository"

export async function myAction(ctx: TenantContext, input: MyInput, repo = new MyRepository()) {
  const record = await repo.findById(ctx, input.id) // repository là instance, nhận ctx — xem products/infra/product-repository.ts
  if (!record) throw notFound()
  return repo.update(ctx, record.id, input)
}
```

### Tạo repository
```typescript
// src/modules/<module>/infra/my-repository.ts
import { db } from "@/lib/db"
import { scopedWhere, scopedData } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy"

export const MyRepository = {
  async findById(ctx: TenantContext, id: string) {
    return db.myTable.findFirst({ where: scopedWhere(ctx, { id }) })
  },
  async create(ctx: TenantContext, data: CreateInput) {
    return db.myTable.create({ data: scopedData(ctx, data) })
  },
}
```

---

## Rules (bắt buộc)

### 1. Route Pattern
- Mọi route PHẢI qua `requireTenantContext()` → `requireCapability()`.
- Khoá bằng test: `tests/unit/architecture/route-capability-guard.test.ts` đỏ khi route mới không gọi gác quyền. Ngoại lệ có chủ đích (webhook, URL ký, đăng nhập…) ghi vào `NO_CAPABILITY_GUARD` kèm lý do.
- Route wrapper `handle()` tự bắt `AppError` và format response; `ZodError` và JSON hỏng tự thành 400 (07/11/2026). Route mới dùng `defineRoute` (bọc `handle()`).
- Route dưới `/api/v1/`. Endpoint duyệt tách: `/x/[id]/approve`.

### 2. Error Handling
- **Lỗi HTTP duy nhất**: class `AppError` tại `src/core/http/errors.ts`. Không tạo error class riêng.
- **Factory functions**: `notFound()`, `validationFailed(details)`, `conflict()`, `quotaExceeded()`.
- **Validation message** viết bằng tiếng Việt: `throw validationFailed({ status: "Phải là một trong: ..." })`.

### 3. Clean Architecture (bắt buộc 4 thư mục)
- `domain/` — pure business logic, **KHÔNG import Prisma, KHÔNG import infra**.
- `use-cases/` — orchestration (có gạch nối, KHÔNG viết `usecases`).
- `infra/` — repository, Prisma queries.
- `adapters/` — external service adapters.

### 4. Import Style
- Path alias `@/` (không relative). Dùng `import type` cho types.
- Thứ tự: External → Core → Modules → Components → Lib.

### 4b. Integration API & OpenAPI (07/11/2026)
- Lược đồ thân/phản hồi của `/api/v1/integration/*` nằm ở `src/modules/integration/contracts/` (`http-requests.ts`, `http-responses.ts`); route import, không tự khai.
- Thêm/sửa route `/integration/*` → thêm operation ở `integration-openapi.ts` → `npm run gen:openapi` → commit tệp `docs/spec/contracts/openapi/integration.openapi.json`. `tests/unit/integration/integration-openapi.test.ts` đỏ nếu quên.

### 5. Pagination (cursor-based)
- Mọi list endpoint PHẢI có `cursor` + `limit` (1–100, **mặc định 25** — đặc tả 06 §2, PO chốt 07/11/2026). Route mới: `pageQuery` + `toPage` (`src/core/http/pagination.ts`), con trỏ mờ.
- Dùng cursor-based (không offset) — ổn định khi data thêm/xóa.

### 6. Transaction
- Dùng `runInTransaction()` từ `@/modules/jobs/infra/transaction` cho multi-step writes.

### 7. Tenancy (trong code)
- `scopedWhere(ctx)` cho đọc, `scopedData(ctx, data)` cho ghi.
- `ownedByTenant(ctx, record)` kiểm tra sở hữu.
- **Ném lỗi** nếu code tự khai `organization_id`.

### 8. RBAC
- Quyền theo **mã năng lực** (capability code), KHÔNG theo vai UI.
- Catalog tại `src/core/rbac/capability-catalog.ts`.
- **Không bao giờ suy quyền từ `roleKey`**.

---

## DO / DON'T

### ❌ DON'T — Lấy org_id từ body
```typescript
export const POST = handle(async (req) => {
  const { organization_id, name } = await req.json()
  await db.product.create({ data: { organization_id, name } })
})
```

### ✅ DO — Giải org_id từ session, validate input
```typescript
export const POST = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  requireCapability(ctx, "L2")
  const input = CreateProductSchema.parse(await req.json())
  return jsonResponse(await createProduct(ctx, input))
})
```

### ❌ DON'T — Query trong loop (N+1)
```typescript
const products = await db.product.findMany({ where: scopedWhere(ctx) })
for (const p of products) {
  p.assets = await db.asset.findMany({ where: { product_id: p.id } })
}
```

### ✅ DO — Batch query với include
```typescript
const products = await db.product.findMany({
  where: scopedWhere(ctx),
  include: { assets: { select: { id: true, url: true } } },
})
```

---

## Reference Files (file mẫu trong codebase)

| Pattern | File |
|---|---|
| API route chuẩn | `src/app/api/v1/products/route.ts` |
| Use-case chuẩn | `src/modules/products/use-cases/create-product.ts` |
| Use-case với transaction | `src/modules/products/use-cases/approve-analysis.ts` |
| Repository chuẩn | `src/modules/products/infra/product-repository.ts` |
| Domain rule thuần | `src/modules/products/domain/product-analysis-rules.ts` |
| Error class | `src/core/http/errors.ts` |
| Response helpers | `src/core/http/response.ts` |
| Tenant context | `src/core/tenancy/tenant-context.ts` |
| RBAC capabilities | `src/core/rbac/capabilities.ts` |

> Xem thêm: skill `testing` để biết cách test API route. Skill `database-schema` cho quy tắc tenant trên bảng mới.
