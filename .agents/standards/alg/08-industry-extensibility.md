# ALG · 08 · Plugin ngành & tính giá (đối chiếu code 30/10/2026)

Áp dụng của [universal/08](../universal/08-industry-extensibility.md). Nguồn: Industry Plugin SSOT (PO 17/10, `AGENTS.md` §Thêm ngành mới), Multi-Industry First (PO 24/10), chuẩn hoá đa ngành `7189612`, khung tính giá `1d4bfad`, API `59c0837`, màn `/tinh-gia` công cụ #31–#35 `1beccb4`.

## 1. Bản đồ code
| Thành phần | Vị trí |
|---|---|
| Contract | `src/modules/organization/domain/industry-plugin-contract.ts` (+ `.test.ts`) |
| Plugin | `organization/domain/industries/{floral,fashion,fnb,homestay,craft-gift,retail-general,services}.ts`, registry `industries/index.ts` |
| Thuật ngữ trung lập | `src/core/terminology/` (`master-terminology-registry.ts`, `use-tier-terminology.ts`), `ti.*` |
| Kiểm đa ngành | `npm run check:industry` (`scripts/check-industry.ts`: registry, contract test, typecheck, ratchet thuật ngữ, prompt/schema worker) · `npm run audit:industry` (chi tiết) · baseline `scripts/industry-term-audit-baseline.json` |
| Tạo ngành mới | `scripts/new-industry.ts` |
| Tính giá | `src/modules/costing/domain/` (`cost-calculator.ts`, `cost-config.ts`, `price-scenarios.ts`, `material-needs.ts`, `material-import.ts`, `price-change.ts`, `bom-adapters.ts`), `use-cases/costing-service.ts`, `infra/costing-repository.ts` |
| Màn | `/tinh-gia` (5 tab, công cụ #31–#35) |

## 2. Trạng thái
| Mục | Trạng thái | Cưỡng chế |
|---|---|---|
| 7 ngành đăng ký, contract đủ khối | ✅ | `check:industry` mục 1–3 |
| Thuật ngữ ngành không hardcode | 🔴 **91 vi phạm, vượt baseline** (IT-F01 "bó hoa" 8 → 73…) — đỏ ngay trên `main` | `audit:industry:check`; **không có trong CI**, chỉ hook pre-commit cục bộ |
| Hồ sơ tính giá: Hoa đầy đủ | ✅ | `costing.test.ts` |
| Hồ sơ tính giá: 6 ngành còn lại | 🟡 `null` (chưa hỗ trợ) | — |
| Không đoán giá thiếu | ✅ | `costing.test.ts` |
| Áp giá thật: xác nhận + audit | ✅ | — |
| a11y màn `/tinh-gia` | ✅ trong bộ done-tools | e2e |

## 3. Quy tắc cho agent
1. Logic/nhãn khác theo ngành → thêm trường vào contract + từng plugin; không `if (industryKey === "floral")`.
2. Chữ hiển thị theo ngành → `getIndustryPlugin(key).terminology` / `ti.*`. Không thêm "bó hoa", "cắm hoa", "tiệm hoa"… (ratchet).
3. Ngành mới → `scripts/new-industry.ts`, rồi `npm run check:industry`.
4. Tính giá: không điền giá thiếu; áp giá qua luồng xác nhận + audit có sẵn.
5. Đưa `audit:industry:check` vào CI hoặc hạ baseline → hỏi PO (đổi CI).
