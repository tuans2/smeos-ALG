# 9a. API Inventory — As-Is (nhóm `ai-*` → `integration`)

Phần tiếp: [09b-api-j-w.md](09b-api-j-w.md).

> Sinh từ mã bằng script dò tĩnh, đã kiểm tay các trường hợp URL ghép động.
> - **Endpoint** viết không kèm `/api/v1` (trừ `/api/health`). `[id]` = tham số động.
> - **Use-case xử lý** = hàm `src/modules/*/use-cases/*` mà route gọi (đóng vai trò mô tả mục đích; tên hàm tự mô tả).
> - **Xác thực**: `Phiên` = `requireTenantContext` (cookie `floraos_session`, 401/409); `Phiên + platform` = `requirePlatformContext`; `Token/SSO tích hợp` = `requireIntegrationContext`; `Công khai (rate limit)` = không phiên, có `enforceRateLimit`; `Không` = không phiên, không rate limit (có thể tự xác thực bằng chữ ký/khoá).
> - **Mã quyền**: mã gọi ở route; nếu route không tự gác thì ghi mã thấy trong use-case. Nhiều method trên cùng route có thể dùng mã khác nhau (vd GET `L1`, POST `L2`).
> - **Input**: khoá body từ schema `zod` ở route và tham số `searchParams` (rút gọn). **Output**: JSON `{ data | ... }` hoặc `{ error: { code, message, details? } }` khi lỗi (`src/core/http/response.ts`); chi tiết hình dạng từng đáp ứng không liệt kê.
> - **Consumer trong repo**: số tệp giao diện gọi tới (dò tĩnh). `—` = không tìm thấy nơi gọi trong repo này.
> - ¹ `P1`, `O1` không tồn tại trong `capability-catalog.ts` → nhánh luôn bị từ chối.

#### `ai-capabilities`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET | `/ai-capabilities` | getAiPolicy | Phiên | U1 | — | — |

#### `ai-policy`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · PUT | `/ai-policy` | getAiPolicy, putAiPolicy | Phiên | U1 U2 | capability_code, allowed_models, quality_target, cost_ceiling, privacy_floor | 2 tệp: `cai-dat-ai/page.tsx`, `so-lieu/page.tsx` |

#### `ai-requests`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET | `/ai-requests` | listAiRequests | Phiên | U3 | — | 1 tệp: `so-lieu/page.tsx` |
| GET · POST | `/ai-requests/review` | reviewAiRequest | Phiên | U3 | id, action, note; query: limit | — |
| GET | `/ai-requests/summary` | summarizeAiRequests | Phiên | U3 | — | — |

#### `health`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET | `/api/health` | — | Công khai | — | — | — |

#### `assets`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/assets` | registerAsset, listAssets | Phiên | G1 G2 | query: limit, product_id, kind, approval_state, parent_asset_id, cu | 17 tệp: `tao-moi/page.tsx`, `tai-anh/page.tsx` … |
| DELETE · GET | `/assets/[id]` | deleteAsset, getAsset | Phiên | G1 G3 | — | 13 tệp: `tao-moi/page.tsx`, `tai-anh/page.tsx` … |
| POST | `/assets/[id]/approve` | approveAsset | Phiên | I2 | — | — |
| GET | `/assets/[id]/view-url` | getAssetViewUrl | Phiên | G1 | — | 7 tệp: `creative-studio/page.tsx`, `tai-anh/page.tsx` … |
| POST | `/assets/upload-url` | createUploadUrl | Phiên | G2 | product_id, mime_type | 12 tệp: `tao-moi/page.tsx`, `tai-anh/page.tsx` … |

#### `audio`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/audio/jobs` | createAudioJob | Phiên | I1 | — | 2 tệp: `creative-studio/audio-workspace.tsx`, `creative-studio/package-revise-panels.tsx` |
| GET | `/audio/jobs/[id]` | getAudioJob | Phiên | I1 | — | 3 tệp: `creative-studio/audio-workspace.tsx`, `creative-studio/package-review-section.tsx` … |
| GET · POST | `/audio/music-tracks` | listMusicTracks, uploadMusicTrack | Phiên | I1 | — | 1 tệp: `creative-studio/audio-library-client.ts` |
| DELETE | `/audio/music-tracks/[id]` | deleteMusicTrack | Phiên | I1 | — | 1 tệp: `creative-studio/audio-library-client.ts` |
| GET | `/audio/music-tracks/system/[trackId]` | readSystemTrack | Phiên | I1 | — | gián tiếp: `preview_url` do `GET /audio/music-tracks` trả về |
| GET · POST | `/audio/voice-clones` | createVoiceClone, listVoiceClones | Phiên | I1 | — | 1 tệp: `creative-studio/audio-library-client.ts` |
| DELETE · GET | `/audio/voice-clones/[id]` | deleteVoiceClone, getVoiceClone | Phiên | I1 | — | 1 tệp: `creative-studio/audio-library-client.ts` |

#### `audit-logs`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET | `/audit-logs` | listAuditLogs | Phiên | G9 | query: limit, cursor | 2 tệp: `audit/page.tsx`, `so-lieu/page.tsx` |

#### `auth`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | logIn | Công khai (không rate limit) | — | email, password | 1 tệp: `dang-nhap/page.tsx` |
| POST | `/auth/logout` | logOut, sessionTokenFrom | Cookie phiên (nếu có) | — | — | 2 tệp: `layout/desktop-nav-footer.tsx`, `layout/user-menu.tsx` |
| GET | `/auth/me` | describeSession, resolveSession | Phiên (không cần tổ chức) | — | — | 5 tệp: `admin/brochure-default-owner-settings.tsx`, `catalog/catalog-list-tab.tsx` … |
| GET | `/auth/session-status` | checkSession | Cookie phiên | — | — | 1 tệp: `layout/session-takeover-watcher.tsx` |
| POST | `/auth/signup` | signUp | Công khai (không rate limit) | — | email, password, name, organization_name | app/(auth)/dang-nhap/page.tsx (URL động) |

#### `branches`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/branches` | createBranch, listBranches | Phiên | F6 F7 | name, code, address | 1 tệp: `thanh-vien/page.tsx` |
| PATCH | `/branches/[id]` | updateBranch | Phiên | F7 | name, address, is_active | — |

#### `brand-profile`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · PUT | `/brand-profile` | getBrandProfile, putBrandProfile | Phiên | F1 F2 | primary_color, secondary_color, accent_color, background_color, text_color, font | 1 tệp: `hooks/use-tenant-profile.ts` |

#### `business-profile`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · PUT | `/business-profile` | getBusinessProfile, putBusinessProfile | Phiên | F1 F2 | legal_name, display_name, phone, email, address, website, social_links, tax_code | 1 tệp: `hooks/use-tenant-profile.ts` |

#### `catalog-links`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/catalog-links` | listCatalogLinks, createCatalogLink | Phiên | J1 | include_revoked, slug, name, description, filters | 4 tệp: `catalog/page.tsx`, `catalog/catalog-link-widgets.tsx` … |
| GET · PATCH | `/catalog-links/[slug]` | getCatalogLinkBySlug, updateCatalogLink | Phiên | J1 | name, description, filters | — |
| POST | `/catalog-links/[slug]/revoke` | revokeCatalogLink | Phiên | J2 | — | — |

#### `chat`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/chat/channels` | listChatChannels, configureChatChannel | Phiên | GET: không mã · POST: T4 (trong use-case) | channel, isEnabled, config | 1 tệp: `kenh-tich-hop/page.tsx` |
| GET · POST | `/chat/conversations` | listConversations, createConversation | Phiên | T1 T2 | query: status, limit | 3 tệp: `hoi-thoai/page.tsx`, `chat/alg-global-copilot.tsx` … |
| POST | `/chat/conversations/[id]/create-order` | convertChatToDraftOrder | Phiên | T3 | — | 2 tệp: `hoi-thoai/page.tsx`, `chat/alg-global-copilot.tsx` |
| GET · POST | `/chat/conversations/[id]/messages` | getConversationMessages, sendChatMessage | Phiên | T1 T2 | — | 2 tệp: `hoi-thoai/page.tsx`, `chat/alg-global-copilot.tsx` |
| POST | `/chat/public/widget` | handleIncomingChannelMessage | Công khai (không rate limit) | — | slug, visitorId, message | 1 tệp: `chat/public-storefront-chat-widget.tsx` |
| GET · POST | `/chat/webhooks/facebook` | handleIncomingChannelMessage | GET: hub.verify_token · POST: không xác thực | — | — | bên ngoài: Facebook (webhook) |
| POST | `/chat/webhooks/zalo` | handleIncomingChannelMessage | Không xác thực | — | — | bên ngoài: Zalo OA (webhook) |

#### `content-engine`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/content-engine/catalog-generate` | getBusinessProfile | Phiên | `J7` | collectionName, occasion, productCount, styleVariant, userDirectives | 3 tệp: `catalog/catalog-link-widgets.tsx`, `catalog/catalog-management-tab.tsx` … |
| GET · POST | `/content-engine/generations` | generateContent, findLatestContentGeneration | Phiên | I1 | query: asset_id, topic_id, scene_plan_id, mode | 2 tệp: `noi-dung/page.tsx`, `creative-studio/creative-result-viewer.tsx` |
| GET | `/content-engine/generations/[id]` | getContentGenerationById | Phiên | I1 | — | — |
| POST | `/content-engine/generations/[id]/approve` | approveContentGeneration | Phiên | J5 | — | 1 tệp: `noi-dung/page.tsx` |
| POST | `/content-engine/landing-generate` | getBusinessProfile, getBrandProfile | Phiên | `J7` | occasionId, occasionLabel, archetypeId, selectedProducts, userDirectives, discou | 1 tệp: `catalog/landing-campaign-tab.tsx` |
| POST | `/content-engine/rewrite` | getBrandProfile, getBusinessProfile | Phiên | không mã (nợ #170) | text, field_type, style | 1 tệp: `profiles/ai-rewrite-input.tsx` |

#### `content-guard`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/content-guard/validate` | — | Phiên | — | text, autoSanitize | — |

#### `coordinator`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/coordinator/exceptions/[id]/resolve` | resolveCoordinatorException | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| GET · POST | `/coordinator/orders` | createCoordinatorOrder, listCoordinatorOrders | Phiên | R1 R2 | query: stage, limit | 3 tệp: `coordinator/coordinator-api.ts`, `coordinator/sla-monitor-modal.tsx` … |
| GET | `/coordinator/orders/[id]` | getCoordinatorOrder | Phiên | R1 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/assign-partner` | assignPartner | Phiên | R4 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/cancel` | cancelCoordinatorOrder | Phiên | R6 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/close` | closeCoordinatorOrder | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| PATCH | `/coordinator/orders/[id]/custom-fields` | updateCoordinatorCustomFields | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/delivery` | recordDeliveryUpdate | Phiên | R5 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/exceptions` | openCoordinatorException | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| GET · POST | `/coordinator/orders/[id]/payments` | listCoordinatorPayments, recordCoordinatorPayment | Phiên | R1 R10 R9 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/production` | recordProductionUpdate | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| POST | `/coordinator/orders/[id]/qc` | recordQcInspection | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| PATCH | `/coordinator/orders/[id]/stage` | updateCoordinatorStage | Phiên | R3 | — | 1 tệp: `coordinator/coordinator-api.ts` |
| GET · POST | `/coordinator/partners` | createPartner, listPartners | Phiên | R1 R4 | query: active | 4 tệp: `coordinator/coordinator-api.ts`, `coordinator/partner-create-form.tsx` … |
| GET · POST | `/coordinator/chain-partners` | listChainPartners, provisionChainPartner | Phiên | F1 F2 | query: status, province, q | 2 tệp: `organization/use-chain-partners.ts`, `dieu-phoi/doi-tac/chain-partner-create-modal.tsx` (tách 12/11/2026) |
| PATCH | `/coordinator/partners/[id]` | updatePartner | Phiên | R4 | — | 1 tệp: `coordinator/partner-management-modal.tsx` |

#### `creative-production`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · PUT | `/creative-production/content-drafts` | getContentDraft, saveContentDraft | Phiên | I1 | query: asset_id, topic_id, mode | 1 tệp: `creative-studio/package-client.ts` |
| POST | `/creative-production/content-rewrites` | rewriteContent | Phiên | I1 | channel, text, hashtags, instruction, product_name, topic_title, price_range | 1 tệp: `creative-studio/package-workspace.tsx` |
| POST | `/creative-production/package` | packageCampaign | Phiên | I1 | campaignName, authenticResult, creativeResult | — |
| GET · POST | `/creative-production/packages` | createCampaignPackage, listCampaignPackages | Phiên | G1 I1 | query: limit, master_asset_id | 2 tệp: `creative-studio/package-client.ts`, `creative-studio/package-workspace.tsx` |
| GET · PATCH | `/creative-production/packages/[id]` | getCampaignPackage, updateCampaignPackage | Phiên | G1 I1 | name, posts, variant_asset_ids, video_job_id, video_job_ids, audio_job_id | 2 tệp: `creative-studio/package-client.ts`, `creative-studio/package-workspace.tsx` |
| POST | `/creative-production/packages/[id]/approve` | approveCampaignPackage | Phiên | J5 | — | 1 tệp: `creative-studio/package-workspace.tsx` |
| PUT | `/creative-production/packages/[id]/launch` | saveLaunchPlan | Phiên | J5 | — | 1 tệp: `creative-studio/package-downstream-card.tsx` |
| GET | `/creative-production/packages/[id]/performance` | getCampaignPerformance | Phiên | R1 | — | 1 tệp: `creative-studio/package-downstream-card.tsx` |
| POST | `/creative-production/packages/[id]/qa` | runCampaignQa | Phiên | I1 | — | 1 tệp: `creative-studio/package-workspace.tsx` |
| POST | `/creative-production/plan` | planProduction | Phiên | I1 | brief | — |
| POST | `/creative-production/produce` | produceCreative, produceAuthentic | Phiên | I1 | brief | 1 tệp: `creative-studio/contents-workspace.tsx` |
| GET · PUT | `/creative-production/providers` | getProviderPreferences, setProviderOrder | Phiên | GET: I1 · PUT: U2 (trong use-case) | — | 2 tệp: `creative-studio/provider-order-settings.tsx`, `creative-studio/provider-select.tsx` |
| GET · POST | `/creative-production/scene-plans` | findScenePlanByKey, generateScenePlan | Phiên | I1 | asset_id, topic_id, mode; query: asset_id, topic_id, mode | 1 tệp: `creative-studio/scene-plan-client.ts` |
| GET · PATCH | `/creative-production/scene-plans/[id]` | getScenePlan, updateScenePlan | Phiên | I1 | scene_index, duration_seconds, voice_script, text_overlay, transition, motion_ef | 1 tệp: `creative-studio/scene-plan-client.ts` |
| POST | `/creative-production/scene-revisions` | reviseScene | Phiên | I1 | sceneIndex, beat, title, setting, lighting, palette, purpose, backgroundPrompt,  | 1 tệp: `creative-studio/package-revise-panels.tsx` |
| POST | `/creative-production/video-assembly` | assembleVideoFromPlan | Phiên | I1 | scene_plan_id, plan, master_asset_id, audio_job_id, title, dry_run, ratio | 1 tệp: `creative-studio/plan-video-assembly.tsx` |

#### `crm`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/crm/customers` | createCustomer, listCustomers | Phiên | Q1 Q2 | query: tier, search, limit, offset | 4 tệp: `khach-hang/page.tsx`, `crm/create-customer-modal.tsx` … |
| DELETE · GET · PATCH | `/crm/customers/[id]` | getCustomerMasterIndex, updateCustomer, deleteCustomer | Phiên | Q1 Q3 Q4 | — | 1 tệp: `crm/customer-detail-modal.tsx` |
| POST | `/crm/customers/[id]/consent` | updateCustomerConsent | Phiên | Q9 | — | 1 tệp: `crm/customer-detail-modal.tsx` |
| GET | `/crm/customers/[id]/master-index` | getCustomerMasterIndex | Phiên | Q1 | — | — |
| POST | `/crm/customers/[id]/occasions` | addCustomerOccasion | Phiên | Q6 | — | 1 tệp: `crm/customer-detail-modal.tsx` |
| GET | `/crm/reminders/upcoming` | scanUpcomingReminders | Phiên | Q7 | query: days | 4 tệp: `khach-hang/page.tsx`, `dashboard/crm-workspace.tsx` … |

#### `field-config`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET | `/field-config` | getEffectiveFieldConfig | Phiên | R1 (gác trong use-case) | query: entity | 1 tệp: `coordinator/custom-fields-section.tsx` |
| GET | `/field-config/catalogs` | listCatalogsForTenant | Phiên | — | query: keys | 1 tệp: `coordinator/coordinator-api.ts` |

#### `greeting-card`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/greeting-card/catalogs` | — | Phiên | L1 R2 | code, name, type, description, filters, productIds; query: cursor, created_by, status, days | 5 tệp: `the-chao/page.tsx`, `catalog/catalog-create-modal.tsx` … |
| DELETE · GET · PATCH | `/greeting-card/catalogs/[id]` | deleteGreetingCatalog, restoreGreetingCatalog | Phiên | L1 R2 | name, description, type, isActive, filters | 4 tệp: `catalog/catalog-list-tab.tsx`, `catalog/use-catalog-items.ts` … |
| GET | `/greeting-card/catalogs/[id]/collage` | catalogCollageById | Phiên | L1 | — | 1 tệp: `catalog/catalog-card.tsx` |
| GET | `/greeting-card/catalogs/[id]/hearts` | getCatalogHearts | Phiên | L1 | — | 1 tệp: `catalog/catalog-hearts-panel.tsx` |
| DELETE · POST | `/greeting-card/catalogs/[id]/products` | — | Phiên | R2 | — | 1 tệp: `catalog/use-catalog-items.ts` |
| POST | `/greeting-card/discount-requests/[id]/decision` | decideDiscount | Phiên | F2 | approve, percent, amountVnd, note | 1 tệp: `inbox/discount-decision.tsx` |
| GET · PUT | `/greeting-card/display-settings` | getDisplaySettings, updateDisplaySettings | Phiên | L1 R2 | templateId, fields; pricing (hidePrice, showDiscounts); thankYou (enabled, percent) | 1 tệp: `journey/display-settings-dialog.tsx` |
| GET | `/greeting-card/inbox` | getInbox | Phiên | R1 | — | 1 tệp: `inbox/use-inbox.ts` |
| GET | `/greeting-card/integrations` | getIntegrationStatus | Phiên | R1 | — | 2 tệp: `admin/brochure-bank-sync-settings.tsx`, `admin/brochure-notify-settings.tsx` |
| PUT | `/greeting-card/integrations/notifications` | updateNotifySettings | Phiên | F2 | enabled, channel, credentials, templates | 1 tệp: `admin/brochure-notify-settings.tsx` |
| POST | `/greeting-card/integrations/notifications/test` | sendTestNotification | Phiên | F2 | — | 1 tệp: `admin/brochure-notify-settings.tsx` |
| DELETE · POST | `/greeting-card/integrations/payment-webhook` | disablePaymentWebhook, rotatePaymentWebhookKey | Phiên | F2 | — | 1 tệp: `admin/brochure-bank-sync-settings.tsx` |
| GET · POST | `/greeting-card/messages` | getThread, sendMessage | Phiên | R1 R2 | stepKey, to, body, replyToId; query: orderId, sessionId | 2 tệp: `inbox/message-composer.tsx`, `inbox/message-thread.tsx` |
| POST | `/greeting-card/messages/read` | markMessagesRead | Phiên | R1 | — | 1 tệp: `inbox/message-thread.tsx` |
| GET | `/greeting-card/messages/recipients` | listRecipients | Phiên | R1 | — | 4 tệp: `admin/brochure-default-owner-settings.tsx`, `catalog/catalog-list-tab.tsx` … |
| GET | `/greeting-card/orders` | resolveSaleScope | Phiên | R1 | query: status, payment | 2 tệp: `admin/admin-brochure-payment-tab.tsx`, `coordinator/coordinator-brochure-tab.tsx` |
| POST | `/greeting-card/orders/[id]/assign-florist` | assignBrochureFlorist | Phiên | R4 (handler dùng chung) | — | components/greeting-card/coordinator/* (URL động) |
| POST | `/greeting-card/orders/[id]/cancel` | cancelBrochureOrder | Phiên | R6 | — | 1 tệp: `admin/admin-order-action-dialog.tsx` |
| POST | `/greeting-card/orders/[id]/confirm-payment` | adminConfirmBrochurePayment | Phiên | R9 | amountVnd, reference, note | 1 tệp: `admin/admin-order-action-dialog.tsx` |
| POST | `/greeting-card/orders/[id]/discount-request` | requestDiscount | Phiên | R2 | percent, amountVnd, reason | 1 tệp: `inbox/discount-request-form.tsx` |
| POST | `/greeting-card/orders/[id]/dispatch-shipping` | dispatchBrochureShipping | Phiên | R5 (handler dùng chung) | — | components/greeting-card/coordinator/* (URL động) |
| POST | `/greeting-card/orders/[id]/product-photo` | uploadBrochureProductPhoto | Phiên | R3 (handler dùng chung) | — | components/greeting-card/coordinator/* (URL động) |
| POST | `/greeting-card/orders/[id]/quote` | quoteBrochureOrder | Phiên | R9 | totalVnd, reason | 1 tệp: `admin/admin-order-action-dialog.tsx` |
| POST | `/greeting-card/orders/[id]/recipient-photo` | uploadBrochureRecipientPhoto | Phiên | R5 (handler dùng chung) | — | components/greeting-card/coordinator/* (URL động) |
| POST | `/greeting-card/orders/[id]/refund` | refundBrochureOrder | Phiên | R10 | amountVnd, reason | 1 tệp: `admin/admin-order-action-dialog.tsx` |
| GET | `/greeting-card/payment-events` | listPaymentEvents | Phiên | R9 | query: status | 1 tệp: `admin/unmatched-payments-panel.tsx` |
| POST | `/greeting-card/payment-events/[id]/handle` | markPaymentEventHandled | Phiên | R9 | — | 1 tệp: `admin/unmatched-payments-panel.tsx` |
| GET · PUT | `/greeting-card/sale-visibility` | getSaleVisibility, setSaleVisibility | Phiên | F2 | userId, mode | 1 tệp: `admin/brochure-visibility-settings.tsx` |
| GET · POST | `/greeting-card/send-links` | createSendLink, resolveSaleScope | Phiên | R1 R2 | catalogId, catalogCode, customerName, customerPhone, prefix, customCatalog; query: sale_id, catalog_id, status | 4 tệp: `the-chao/page.tsx`, `journey/use-journey-catalogs.ts` … |
| POST | `/greeting-card/send-links/[id]/copied` | markSendLinkCopied | Phiên | R2 | — | 1 tệp: `share/tracked-copy.ts` |
| POST | `/greeting-card/send-links/[id]/revoke` | revokeSendLink | Phiên | R2 | — | 1 tệp: `sales/sales-session-table.tsx` |
| GET · POST | `/greeting-card/share-links` | createShareLink, listShareLinks | Phiên | R1 R2 | — | 2 tệp: `share/tracked-copy.ts`, `tracking/share-links-summary.tsx` |
| GET | `/greeting-card/stats` | getSalesFunnel | Phiên | R1 | query: days | 1 tệp: `sales/sales-funnel-stats.tsx` |
| GET | `/greeting-card/stats/channels` | getChannelFunnel | Phiên | R1 | query: days | 1 tệp: `sales/channel-funnel-stats.tsx` |
| GET | `/greeting-card/tracking` | queryTracking | Phiên | R1 | — | 6 tệp: `tracking/brochure-order-tracking-tab.tsx`, `views/calendar-view.tsx` … |
| GET | `/greeting-card/tracking-pipeline` | getTrackingPipeline | Phiên | R1 | — | 1 tệp: `work/use-worklist.ts` |
| GET | `/greeting-card/tracking/timeline` | getTrackingTimeline | Phiên | R1 | — | 1 tệp: `views/timeline-view.tsx` |

#### `integration-tokens`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| GET · POST | `/integration-tokens` | issueIntegrationToken, listIntegrationTokens | Phiên | F9 | client, ttl_days | — |
| DELETE | `/integration-tokens/[id]` | revokeIntegrationToken | Phiên | F9 | — | — |
| POST | `/integration-tokens/[id]/rotate` | rotateIntegrationToken | Phiên | F9 | — | — |

#### `integration`

| Method | Endpoint | Use-case xử lý | Xác thực | Mã quyền | Input | Consumer trong repo |
|---|---|---|---|---|---|---|
| POST | `/integration/assets` | toTenantContext, registerIntegrationAsset | Token/SSO tích hợp | — | asset_id, product_id, parent_asset_id, kind, storage_key, mime_type, width, heig | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| GET | `/integration/brand-profile` | toTenantContext, getBrandProfile | Token/SSO tích hợp | — | — | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| GET | `/integration/business-profile` | toTenantContext, getBusinessProfile | Token/SSO tích hợp | — | — | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| POST | `/integration/capabilities/check` | checkCapabilities | Token/SSO tích hợp | — | user_id, capability_codes | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| GET · POST | `/integration/catalog-links` | toTenantContext, listCatalogLinks, createCatalogLink | Token/SSO tích hợp | J1 (nhánh SSO) | include_revoked, slug, name, description, filters | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| PATCH | `/integration/catalog-links/[slug]` | toTenantContext, updateCatalogLink | Token/SSO tích hợp | J1 (nhánh SSO) | name, description, filters | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| POST | `/integration/catalog-links/[slug]/revoke` | toTenantContext, revokeCatalogLink | Token/SSO tích hợp | J2 (nhánh SSO) | — | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| POST | `/integration/content-metrics` | toTenantContext, recordContentMetrics | Token/SSO tích hợp | — | platform, content_id, metric_date, reach, impressions, engagement, clicks, conve | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| POST | `/integration/jobs` | toTenantContext, enqueueJob | Token/SSO tích hợp | — | feature, payload, product_id, idempotency_key | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| GET | `/integration/products` | toTenantContext, listProducts | Token/SSO tích hợp | token: phạm vi client · SSO: năng lực thật (L5 cắt khối giá) | query: limit, branch_id, category, occasion_code, color, collection | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| GET | `/integration/products/[id]/master-image` | toTenantContext, getMasterImage | Token/SSO tích hợp | — | — | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |
| POST | `/integration/usage` | toTenantContext, recordExternalUsage | Token/SSO tích hợp | — | feature, quantity, cost_usd, status, job_id | bên ngoài: LocalBudd/SocialFlow — NOT VERIFIED trong repo này |

