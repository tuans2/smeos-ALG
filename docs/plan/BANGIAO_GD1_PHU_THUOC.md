# Phụ thuộc của bản giao GD1

Sinh bằng `npm run release:routes` từ `src/lib/delivery/gd1.manifest.json` — không sửa tay.

## Tổng quan

| Mục | Giữ | Bị chặn hoặc bỏ |
|---|---:|---:|
| Trang | 90 | 27 |
| API | 491 | 61 |
| Tệp trong `src/` | 3623 | 674 |

## Code trong phạm vi chạm vùng không giao

| Từ | Tới | Trạng thái |
|---|---|---|
| `src/app/api/v1/_contracts/requests-tools.ts` | `/api/v1/proxy/[...path]` | Đã ghi nhận, xử lý ở Bước 4 |

## Liên kết tới trang không giao

Đường dẫn viết cứng trong mã được giao. Nút hoặc khối dẫn tới đó phải ẩn khi trang không thuộc giai đoạn (`isHrefInPhase`), nếu không người dùng bấm vào sẽ gặp trang 404 khi bật chế độ giai đoạn hoặc trong bản cắt.

| Từ | Tới | Trạng thái |
|---|---|---|
| `src/app/(app)/duyet/page.tsx` | `/creative-studio` | Ẩn khi không thuộc giai đoạn |
| `src/app/(app)/tai-anh/page.tsx` | `/creative-studio` | Ẩn khi không thuộc giai đoạn |
| `src/components/catalog/share-catalog-modal.tsx` | `/noi-dung` | Ẩn khi không thuộc giai đoạn |
| `src/components/dashboard/crm-toolkit-grid.tsx` | `/hoi-thoai` | Ẩn khi không thuộc giai đoạn |
| `src/components/dashboard/crm-workspace.tsx` | `/hoi-thoai` | Ẩn khi không thuộc giai đoạn |
| `src/components/dashboard/customer-service-workspace.tsx` | `/hoi-thoai` | Ẩn khi không thuộc giai đoạn |
| `src/components/dashboard/store-growth-center.tsx` | `/creative-studio` | Ẩn khi không thuộc giai đoạn |
| `src/components/dashboard/store-growth-center.tsx` | `/market-intelligence` | Ẩn khi không thuộc giai đoạn |
| `src/components/integrations/api-tokens-panel.tsx` | `/tich-hop/tai-lieu-api` | Ẩn khi không thuộc giai đoạn |
| `src/components/organization/ai-channels-settings-tab.tsx` | `/ket-noi` | Ẩn khi không thuộc giai đoạn |
| `src/components/products/one-image-kit-dialog.tsx` | `/in-an` | Ẩn khi không thuộc giai đoạn |

## Mô-đun bị cắt giữa chừng

Tệp còn lại / tổng số tệp của mô-đun. Phần bị bỏ không được tệp nào trong phạm vi dùng tới.

| Mô-đun | Giữ |
|---|---:|
| `ad-banner-poster` | 11/13 |
| `assets` | 27/30 |
| `audio-studio` | 12/17 |
| `catalog-studio` | 9/10 |
| `chain-partnership` | 13/14 |
| `chat-assistant` | 51/54 |
| `content-engine` | 42/44 |
| `coordinator` | 58/76 |
| `creative-production` | 17/68 |
| `crm` | 40/41 |
| `field-platform` | 41/46 |
| `greeting-card` | 284/288 |
| `integration` | 22/26 |
| `integration-hub` | 34/35 |
| `jobs` | 19/20 |
| `journey` | 6/17 |
| `landing-page` | 4/7 |
| `market-intelligence` | 16/30 |
| `media` | 11/21 |
| `notification` | 46/47 |
| `organization` | 102/111 |
| `platform` | 56/64 |
| `print` | 6/8 |
| `product-photo-studio` | 6/7 |
| `products` | 69/73 |
| `profiles` | 27/29 |
| `sales` | 19/20 |
| `templates` | 5/6 |
| `toolkit` | 9/10 |
| `video-studio` | 10/18 |

## API bị chặn khi bật chế độ giai đoạn

Có route nhưng không trang, API hay tác vụ nào trong phạm vi gọi tới.

- `/api/v1/assets/[id]/approve`
- `/api/v1/audio/jobs/[id]`
- `/api/v1/audio/music-tracks`
- `/api/v1/audio/music-tracks/[id]`
- `/api/v1/audio/voice-clones`
- `/api/v1/audio/voice-clones/[id]`
- `/api/v1/chat/webhooks/facebook`
- `/api/v1/chat/webhooks/zalo`
- `/api/v1/content-engine/generations/[id]`
- `/api/v1/creative-production/content-drafts`
- `/api/v1/creative-production/content-rewrites`
- `/api/v1/creative-production/package`
- `/api/v1/creative-production/packages`
- `/api/v1/creative-production/packages/[id]`
- `/api/v1/creative-production/packages/[id]/approve`
- `/api/v1/creative-production/packages/[id]/launch`
- `/api/v1/creative-production/packages/[id]/performance`
- `/api/v1/creative-production/packages/[id]/qa`
- `/api/v1/creative-production/plan`
- `/api/v1/creative-production/produce`
- `/api/v1/creative-production/scene-plans`
- `/api/v1/creative-production/scene-plans/[id]`
- `/api/v1/creative-production/scene-revisions`
- `/api/v1/creative-production/video-assembly`
- `/api/v1/crm/customers/[id]/master-index`
- `/api/v1/customer-segments/[id]/customers`
- `/api/v1/customers/[id]/interactions`
- `/api/v1/greeting-card/integrations/staff-notifications/saas-policy`
- `/api/v1/jobs/[id]/events`
- `/api/v1/media/optimizations/[id]/download`
- `/api/v1/media/variants/[id]`
- `/api/v1/media/variants/[id]/approve`
- `/api/v1/media/variants/[id]/download`
- `/api/v1/media/variants/batch`
- `/api/v1/notification/inbox/[id]/read`
- `/api/v1/notification/inbox/mark-all-read`
- `/api/v1/platform/marketplace/import-excel`
- `/api/v1/platform/marketplace/import-excel/preview`
- `/api/v1/platform/marketplace/share-links`
- `/api/v1/platform/marketplace/share-links/[id]`
- `/api/v1/platform/marketplace/stores`
- `/api/v1/platform/marketplace/stores/[id]`
- `/api/v1/platform/marketplace/stores/bulk-delete`
- `/api/v1/platform/marketplace/sync`
- `/api/v1/platform/marketplace/sync-photos`
- `/api/v1/platform/notification/visibility`
- `/api/v1/platform/orgs-data/[orgId]`
- `/api/v1/platform/orgs-data/[orgId]/assets/[assetId]/legal-hold`
- `/api/v1/platform/orgs-data/[orgId]/legal-hold`
- `/api/v1/print/renditions/[id]`
- `/api/v1/print/renditions/[id]/export`
- `/api/v1/product-photo/[id]/retry`
- `/api/v1/proxy/[...path]`
- `/api/v1/short-links/[id]/stats`
- `/api/v1/template-overrides/[templateKey]/[fieldKey]`
- `/api/v1/video/jobs/[id]`
- `/api/v1/video/jobs/[id]/approve-script`
- `/api/v1/video/jobs/[id]/approve-video`
- `/api/v1/video/jobs/[id]/render`
- `/api/v1/video/jobs/[id]/storyboard`
- `/api/v1/vision/engine`
