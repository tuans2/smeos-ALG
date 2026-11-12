# ALG · 07 · AI & Content Engine (đối chiếu code 30/10/2026)

Áp dụng của [universal/07](../universal/07-ai-content.md). Skill chi tiết: `.agents/skills/ai-integration/SKILL.md`. Nguồn: tách repo interface (`eaac8e9`), SSRF + prompt QC theo ngành (`d73e148`), QC khi AI lỗi (`d6fe1bf`), prompt v2 + copy guard (`38079f9`), ghi chú bán hàng (`c1d34c4`, `f023bfa`), mẫu dự phòng + log phiên bản (`85d2ffd`), capability J7 (`7bf51ba`).

## 1. Bản đồ code
| Thành phần | Vị trí |
|---|---|
| Gateway | `src/core/ai/gateway.ts` (`callCapability`), `wiring.ts` |
| Định tuyến, riêng tư, đánh giá | `core/ai/domain/routing.ts`, `privacy.ts`, `evaluation.ts`, `ai-capabilities.ts` (mã `AIC-xx`) |
| Kiểm từ cấm | `core/ai/domain/flower-content-guard.ts` + `flower-content-banned-lexicon.json` |
| Adapter LLM | `core/ai/adapters/` (OpenAI, Anthropic, Gemini, multi-provider) |
| Prompt registry | `modules/content-engine/domain/prompts/active.ts` (`landingWriter`, `catalogWriter` = v2; v1 giữ để rollback) |
| Prompt | `prompts/{landing,catalog}/v1.ts, v2.ts`, `writer/`, `critic/`, `rewriter/`, `strategist/` |
| Bộ kiểm chữ landing | `content-engine/domain/landing-copy-guard.ts`; `deterministic-checks.ts`, `product-truth-validator.ts` |
| Mẫu dự phòng | `landing-content-generator.ts`, `catalog-content-generator.ts`, `fallback-post.ts` |
| An toàn đầu vào | `src/lib/safe-remote-url.ts` cho ảnh gửi AI |

## 2. Trạng thái
| Mục | Trạng thái | Cưỡng chế |
|---|---|---|
| Gateway duy nhất | ✅ | `gateway.test.ts`; SDK chỉ import trong `core/ai/adapters/` |
| Chặn gọi thẳng nhà cung cấp | ✅ `no-direct-ai-provider.test.ts` quét toàn `src/` ngoài `adapters/`, `core/ai/`; 1 ngoại lệ (`voice-clones.ts` xoá giọng ElevenLabs) | nợ #197 (đã trả) |
| Prompt có phiên bản + registry | ✅ landing, catalog | test registry v2 |
| Copy guard + mẫu dự phòng qua guard | ✅ landing, catalog | test copy guard, fallback |
| Log promptId/version/source | ✅ `landing_content.generated`, `catalog_content.generated` | test log |
| Ghi chú bán hàng đã duyệt (H5) vào prompt | ✅ | — |
| Prompt QC theo ngành (`aiConfig.visionFocus`) | ✅ | — |
| Copy guard cho công cụ nội dung khác (poster, bài đăng…) | 🟡 chưa thống nhất | — |
| Worker Python (vision) | gọi AI phía worker — xem skill `worker-python` | — |

## 3. Quy tắc cho agent
1. Gọi AI → `callCapability` với capability `AIC-xx`; không import SDK ngoài `core/ai/adapters/`.
2. Prompt mới/đổi → phiên bản mới trong `prompts/<loại>/vN.ts`, đăng ký `active.ts`, giữ bản cũ.
3. Nội dung cho khách → qua copy guard; mẫu dự phòng cũng qua guard (test).
4. Log chỉ metadata (id, phiên bản, nguồn, lý do).
5. Route sinh landing/catalog cần capability J7.
6. Thêm nhà cung cấp/mô hình trả phí, đổi sàn riêng tư hay lọc giấy phép → hỏi PO.
