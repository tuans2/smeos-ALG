---
name: worker-python
description: >-
  Quy tắc phát triển Python workers cho ALG. Kích hoạt khi agent tạo/sửa
  code trong workers/, bao gồm vision worker, media_ai worker (image, video,
  audio, guard), hoặc job system, hoặc bất kỳ logic nào liên quan đến
  background job processing.
---

# Python Workers — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (Khuôn chuẩn Worker ALG)

### Job Handler & 3 Trục Trạng thái (status / stage / result)

> Rà theo mã thật 05/10/2026. Bản trước dùng `update_stage`/`set_verdict`/`input_storage_path` — các tên đó KHÔNG tồn tại. Khuôn dưới rút gọn từ `workers/media_ai/jobs/worker.py`.

```python
# workers/media_ai/jobs/worker.py — rút gọn
def claim_next(conn, feature):            # SELECT … FOR UPDATE SKIP LOCKED LIMIT 1
    ...                                    # → status = 'PROCESSING', started_at = now()

def process_job(conn, job, ...):
    payload = job["payload"] if isinstance(job["payload"], dict) else json.loads(job["payload"])
    organization_id = job["organization_id"]          # chỉ từ dòng job, KHÔNG từ payload
    asset_goc = _doc_asset(conn, organization_id, payload["asset_id"])  # đọc asset có lọc tổ chức
    anh_goc = _read_bytes(asset_goc["storage_key"])   # bọc shared.storage.doc_bytes(key, STORAGE_ROOT)

    _set_stage(conn, job["id"], "ANALYZING")          # UPDATE generation_jobs.stage + job_events
    ...
    # Phán quyết: cổng từ chối vẫn là COMPLETED — REJECTED KHÔNG phải FAILED
    # UPDATE generation_jobs SET status = 'COMPLETED', result = %s, stage = NULL, completed_at = now()
```
Đường dẫn ghi: `org/<organization_id>/<product_id>/<asset_id>.<ext>` qua `_write_bytes` (`shared.storage.ghi_bytes`).
---

## Rules (bắt buộc)

### 1. Job System — Ba trục tách rời
- `status` / `stage` / `result` tách rời.
- `COMPLETED + result=REJECTED` **KHÔNG phải** `FAILED`.
- `usage` ghi ở core (tại điểm tạo job), KHÔNG ghi ở worker.

### 2. Worker Pattern
- Lấy việc: `SELECT … FOR UPDATE SKIP LOCKED` + `LISTEN/NOTIFY`.
- **CẤM `subprocess` + parse stdout.**
- **CẤM chạy job qua HTTP.**

### 3. Storage Path
Format: `org/<organization_id>/<product_id>/<asset_id>.<ext>`.

### 4. Provider Routing
- Dùng provider → dùng TOÀN BỘ tính năng, không trộn cục bộ.
- Mọi bên lỗi → lùi luồng cục bộ + GHI RÕ lý do.

### 5. Worker Modules & Lệnh

| Worker | Module | Lệnh |
|---|---|---|
| Vision | `vision.jobs.worker` | `npm run worker:vision` |
| Media | `media_ai.jobs.worker` | `npm run worker:media` |
| Video | `media_ai.video.video_worker` | `npm run worker:video` |
| Market Intel | TS worker | `npm run worker:market-intelligence` |
| Tất cả | — | `npm run dev:all` |
| Test | pytest | `cd workers && .venv/bin/python -m pytest tests -q` |

---

## DO / DON'T

### ❌ DON'T — Gọi worker qua HTTP
```python
# Từ Next.js API route
requests.post("http://localhost:8080/process-image", json=payload)
```

### ✅ DO — INSERT job vào DB, worker tự lấy
```typescript
// Từ Next.js use-case — enqueueJob ghi generation_jobs + usage/credit + Idempotency-Key trong MỘT giao dịch
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
const { job } = await enqueueJob(ctx, { feature: "media.optimize", payload, idempotencyKey })
// Worker tự SELECT … FOR UPDATE SKIP LOCKED (claim_next) — không bao giờ INSERT thẳng vào generation_jobs
```

### ❌ DON'T — subprocess + parse stdout
```python
output = subprocess.check_output(["python", "script.py", image_path])
result = parse_json(output.decode())
```

### ✅ DO — Import và gọi trực tiếp
```python
# Import module Python và gọi hàm trong cùng tiến trình worker (vd media_ai/jobs/worker.py gọi
# verifier.phan_tich(...), enhancer.enhance(...)) — không spawn tiến trình con rồi parse stdout.
ket_qua = enhancer.enhance(anh_goc, config)
```

---

## Reference Files

| Pattern | File |
|---|---|
| Media worker entry | `workers/media_ai/jobs/worker.py` |
| Video worker | `workers/media_ai/video/video_worker.py` |
| Scene providers | `workers/media_ai/providers/scene/` |
| Shared DB utils | `workers/shared/` |
| Worker requirements | `workers/requirements.txt` |
| Generate scene | `workers/media_ai/generate_scene.py` |

> Xem thêm: skill `ai-integration` §3 cho provider rules. Skill `database-schema` §3 cho tenant trên bảng jobs.
