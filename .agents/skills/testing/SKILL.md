---
name: testing
description: >-
  Quy tắc testing cho ALG. Kích hoạt khi agent viết test, debug test failure,
  cấu hình Vitest/Playwright, hoặc cần chạy test suite (unit, tenant, e2e).
---

# Testing — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (copy-paste)

### Unit test cho use-case
```typescript
// tests/unit/<module>/<action>.test.ts
import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const ctx: TenantContext = { organizationId: "org-test", userId: "user-1", capabilities: ["L1"] }

describe("myAction", () => {
  it("trả về kết quả khi input hợp lệ", async () => {
    const result = await myAction(ctx, { name: "Test" })
    expect(result).toBeDefined()
    expect(result.name).toBe("Test")
  })

  it("ném notFound khi id không tồn tại", async () => {
    await expect(myAction(ctx, { id: "invalid" })).rejects.toThrow("NOT_FOUND")
  })
})
```

### Tenant isolation test (Chuẩn ALG: 404 chứ không 403)
```typescript
// tests/tenant/<resource>.test.ts — khuôn thật, xem tests/tenant/greeting-card.test.ts
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

describe("<resource> — cách ly tenant", () => {
  let tenantA: Tenant
  let tenantB: Tenant

  beforeEach(async () => {
    await resetDatabase()                 // TRUNCATE mọi bảng trong TENANT_TABLES
    tenantA = await createTenant("alpha") // dựng tổ chức qua đúng luồng đăng ký thật
    tenantB = await createTenant("beta")
  })
  afterAll(async () => { await disconnectDatabase() })

  it("tổ chức A không đọc được bản ghi của B (null/404, KHÔNG 403)", async () => {
    const recordB = await repo.create(tenantB.ctx, { name: "Bí mật B" })
    expect(await repo.findById(tenantA.ctx, recordB.id)).toBeNull()
  })
})
```
Bảng tenant mới ⇒ thêm tên bảng vào `TENANT_TABLES` (`tests/helpers/database.ts`) — `npm run check:docs` đỏ nếu quên.
---

## Rules (bắt buộc)

### 1. Test Suites & Lệnh

| Suite | Lệnh | Gate |
|---|---|---|
| Unit | `npm test` | Không thêm ca đỏ so với `main` (nợ #172) |
| Tenant | `npm run test:tenant` | **BẮT BUỘC xanh trước merge** |
| Platform | `npm run test:platform` | Phải xanh |
| E2E | `npm run test:e2e` | Cần worker media đang chạy |
| Worker | `cd workers && .venv/bin/python -m pytest tests -q` | |
| Typecheck | `npm run typecheck` | Phải sạch 100% |

### 2. Naming Convention

- `describe("functionName")` — tên hàm/module đang test.
- `it("mô tả hành vi bằng tiếng Việt")` — mô tả kỳ vọng.
- Ví dụ: `it("ném lỗi khi thiếu tên sản phẩm")`, `it("trả về danh sách phân trang")`.

### 3. Mocking Strategy

- **Mock ở tầng infra**: Mock repository, không mock domain logic.
- **Dùng `vi.mock()`** cho external services (AI, storage).
- **KHÔNG mock** `TenantContext`. Unit test: dựng context thật `{ organizationId: "org-test", ... }`. Tenant test: dùng `createTenant()` (`tests/helpers/fixtures.ts`) — tổ chức thật qua luồng đăng ký.
- **Test DB** cho tenant test: dùng `floraos_test`, setup bằng `npm run db:test:setup`.

### 4. Test Data

- Tạo test data rõ ràng trong mỗi test. Không dùng shared mutable state.
- Tenant suite: `resetDatabase()` ở `beforeEach` (TRUNCATE), `disconnectDatabase()` ở `afterAll`.

### 5. Vitest Gotchas

- **`fileParallelism: false`** trong `vitest.config.ts`: GIỮ NGUYÊN `false` — các tệp tenant dùng chung DB, chạy song song sẽ đè dữ liệu nhau.
- **`server-only` stub**: Đã alias tại `vitest.config.ts` → `tests/helpers/server-only-stub.ts`. Không cần xử lý riêng.
- **Setup**: `tests/setup.ts` chạy trước mỗi suite.

---

## DO / DON'T

### ❌ DON'T — Test không assert rõ ràng
```typescript
it("works", async () => {
  const result = await myAction(ctx, input)
  expect(result).toBeTruthy() // Quá chung chung
})
```

### ✅ DO — Assert cụ thể
```typescript
it("tạo sản phẩm với tên và organization_id đúng", async () => {
  const result = await createProduct(ctx, { name: "Hoa Hồng" })
  expect(result.name).toBe("Hoa Hồng")
  expect(result.organization_id).toBe(ctx.organizationId)
  expect(result.status).toBe("DRAFT")
})
```

### ❌ DON'T — Quên test tenant isolation
```typescript
// Chỉ test happy path, quên kiểm tra cross-tenant
it("lấy sản phẩm", async () => {
  const product = await getProduct(ctx, id)
  expect(product).toBeDefined()
})
```

### ✅ DO — Test tenant boundary
```typescript
it("không trả sản phẩm của tổ chức khác", async () => {
  const otherCtx = { ...ctx, organizationId: "org-other" }
  const product = await getProduct(otherCtx, productOfOrgA.id)
  expect(product).toBeNull()
})
```

---

## Reference Files

| Pattern | File |
|---|---|
| Vitest config | `vitest.config.ts` |
| Test setup | `tests/setup.ts` |
| server-only stub | `tests/helpers/server-only-stub.ts` |
| Unit test mẫu | `tests/unit/market-intelligence/` |
| Tenant test mẫu | `tests/tenant/` |
| E2E test | `tests/e2e/` |
| Architecture test (cấm import Prisma ngoài infra) | `tests/tenant/khong-import-prisma-ngoai-infra.test.ts` |
| Architecture test (route phải gác mã năng lực) | `tests/unit/architecture/route-capability-guard.test.ts` |
| Tenant context test | `src/core/tenancy/tenant-context.test.ts` |

> Xem thêm: skill `api-development` cho pattern API cần test. Skill `database-schema` §4 cho DB test setup.
