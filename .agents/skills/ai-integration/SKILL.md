---
name: ai-integration
description: >-
  Quy tắc tích hợp AI cho ALG. Kích hoạt khi agent làm việc với AI gateway,
  provider adapters, port interfaces, hoặc bất kỳ file nào trong src/core/ai/,
  src/core/ports/, hoặc module adapters gọi AI services (OpenAI, Anthropic, ElevenLabs).
---

> **Cập nhật 30/10/2026 — đọc trước.** `.agents/standards/smeos/07-ai-content.md` (prompt registry `content-engine/domain/prompts/active.ts`, copy guard, mẫu dự phòng qua guard, log promptId/version/source, J7) · nguyên tắc chung `universal/07-ai-content.md`. Test `no-direct-ai-provider.test.ts` chặn SDK/endpoint/khoá nhà cung cấp ngoài `adapters/` và `core/ai/` trên toàn `src/` — vẫn bắt buộc `callCapability` ở mọi nơi.


# AI Integration — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (copy-paste)

> Rà theo mã thật 05/10/2026 (`src/core/ai/gateway.ts`). Không có `aiGateway.generate` hay `AICircuitBreaker` — bản trước của skill này ghi sai.

### Gọi AI qua gateway
```typescript
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"

const result = await callCapability(
  {
    capability: "content_generation", // mã AIC-xx hoặc tên năng lực
    privacy: "SHOP",                   // suy từ LOẠI dữ liệu, không nhận từ client
    jobId: job.id,                     // null nếu chạy tại chỗ không có job
  },
  myAdapter,          // AdapterRun<O>: (model) => Promise<AdapterOutcome<O>>
  aiGatewayDeps(ctx)  // chỗ duy nhất nối repo thật (wiring.ts)
)
if (result.kind !== "xong") {
  // "khong_chay_duoc": hết đường dự phòng — job FAILED + hoàn credit (việc của `usage`)
}
```
Mẫu thật: `src/modules/creative-production/use-cases/generate-scene-plan.ts`.

### Tạo adapter mới cho provider
```typescript
// src/core/ai/adapters/<provider>-llm-provider.ts
import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider"

export class MyProviderLLM implements LLMProvider {
  // SDK nhà cung cấp chỉ được import ở đây — KHÔNG ở đâu khác
}
```
Mẫu thật: `src/core/ai/adapters/anthropic-llm-provider.ts`, `openai-llm-provider.ts`.

---

## Rules (bắt buộc)

### 1. AI Gateway
- Mọi lời gọi AI đi qua `src/core/ai/gateway.ts`. Cấm gọi SDK trực tiếp.
- **Mã nghiệp vụ gọi NĂNG LỰC, không gọi nhà cung cấp.**
- Mô hình AI là hàng trong bảng `ai_models`, không phải hằng trong mã.

### 2. Port Interfaces (12 tệp tại `src/core/ports/`, xuất qua `index.ts`)
`llm-provider` · `image-provider` · `video-provider` · `speech-provider` · `vision-analyzer` · `segmentation-provider` · `embedding-provider` · `storage-provider` · `queue-provider` · `publisher-provider` · `trend-provider` · `shared-media`

### 3. Provider Rules
- SDK (OpenAI, Anthropic, ElevenLabs) **chỉ xuất hiện** trong `adapters/`.
- Providers tương đương: cùng port + bảng năng lực, bên lỗi → bên kế, mọi bên lỗi → luồng cục bộ + GHI RÕ lý do.
- Khi dùng provider → dùng TOÀN BỘ tính năng, không trộn cục bộ.

### 4. Licensing (bắt buộc)
Mô hình không vào production thiếu 1 trong 4 ô: `license`, `commercial_use`, `territory`, `allowed_use`. Filter: `eligibleModels()`.

### 5. Privacy Floor
Lời gọi `SENSITIVE` không ra nhà cung cấp ngoài, kể cả fallback.

### 6. Giới hạn lần thử (Aegis)
Không có lớp circuit breaker riêng. Gateway tự giới hạn: `maxAttempts` mặc định 3, trần 5; chuỗi dự phòng chỉ đổi nhà cung cấp, không vượt sàn quyền riêng tư; hết đường trả `khong_chay_duoc`. Mã gọi KHÔNG tự bọc vòng thử lại quanh `callCapability`.

---

## DO / DON'T

### ❌ DON'T — Import SDK trực tiếp trong use-case
```typescript
// src/modules/<module>/use-cases/generate-text.ts
import OpenAI from "openai"  // KHÔNG!
const client = new OpenAI()
const result = await client.chat.completions.create(...)
```

### ✅ DO — Gọi qua gateway
```typescript
// src/modules/<module>/use-cases/generate-text.ts
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
const result = await callCapability({ capability: "content_generation", privacy: "SHOP", jobId }, adapter, aiGatewayDeps(ctx))
```

---

## Reference Files

| Pattern | File |
|---|---|
| AI Gateway | `src/core/ai/gateway.ts` |
| Gateway test | `src/core/ai/gateway.test.ts` |
| Wiring (DI) | `src/core/ai/wiring.ts` |
| Port interfaces | `src/core/ports/` (12 files + `index.ts`) |
| Provider mẫu | `workers/media_ai/providers/scene/` |

> Xem thêm: skill `worker-python` §5 cho provider routing trong worker.
