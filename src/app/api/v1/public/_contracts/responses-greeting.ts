/** Điểm gom phản hồi Thẻ chào công khai (audit API đợt 6) — tên theo operation. */
export {
  availabilityResponse,
  inquiryResponse,
  quoteResponse,
  submittedOrder as brochureOrderResponse,
} from "./responses-greeting-shared"
export {
  brochureOpenedResponse as brochureClaimResponse,
  brochureOpenedResponse as brochureOpenResponse,
  brochureEventResponse,
  brochureHistoryResponse,
  brochureReorderResponse,
  brochureSelectResponse,
  brochureUnlockResponse,
  brochureViewResponse,
  paymentNotifyResponse,
  paymentProofResponse,
} from "./responses-greeting-session"
export {
  approvePhotoResponse,
  catalogEventResponse,
  changeRequestResponse,
  flowerSubstituteAnswerResponse as flowerSubstituteResponseResponse,
  greetingCatalogOrderResponse as catalogOrderResponse,
  substituteAnswerResponse as substituteResponseResponse,
  trackingResponse,
} from "./responses-greeting-tracking"
