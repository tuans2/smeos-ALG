# Adapter của module tích hợp

Trống ở P7: `LocalBudd` và `SocialFlow` gọi vào qua HTTP
(`/api/v1/integration/*`), core không gọi ngược ra hai repo đó ở module này —
xem `docs/kien-truc/M04_ALG_PRODUCT_IMAGE_OPTIMIZER_FULL.md` cho ranh
giới M04a/M04b và `src/core/ports/publisher-provider.ts` cho cổng đăng bài
(thực thi ở phía `SocialFlow`, không phải ở đây).
