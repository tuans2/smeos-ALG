/**
 * Domain entity types for Partner Marketplace (SaaS Mother)
 * Phân loại 100% 75 cột khảo sát thành 8 nhóm dữ liệu chuẩn mực.
 * Hỗ trợ exactOptionalPropertyTypes với `| undefined`.
 */

export interface PartnerStoreAudit {
  timestamp: string
  specialist: string
  surveyDate: string
  surveyType: string
  notes?: string | undefined
}

export interface PartnerStoreIdentity {
  shopName: string
  legalName?: string | undefined
  taxCode?: string | undefined
  ownerName: string
  contactPerson: string
  operatingYears: string
  scale: string
  legalCompliance?: string | undefined
}

export interface PartnerStoreContact {
  phone: string
  email?: string | undefined
  address: string
  googleMaps?: string | undefined
}

export interface PartnerStoreDigital {
  facebook?: string | undefined
  tiktok?: string | undefined
  website?: string | undefined
  googleReview?: string | undefined
  facebookFollowers?: string | undefined
  tiktokFollowers?: string | undefined
  postingFrequency?: string | undefined
  onlineOrderChannels?: string | undefined
  adsAndLivestream?: string | undefined
}

export interface PartnerStoreBusiness {
  monthlyRevenue?: string | undefined
  dailyOrdersNormal?: string | undefined
  dailyOrdersPeak?: string | undefined
  aov?: string | undefined
  targetCustomers?: string | undefined
  b2bShare?: string | undefined
  customerSources?: string | undefined
  paymentMethods?: string | undefined
  challenges?: string | undefined
  goals12m?: string | undefined
  algExpectations?: string | undefined
  cooperationWishes?: string | undefined
}

export interface PartnerStoreProduction {
  productLines: string[]
  mainProductLine?: string | undefined
  floristCount?: string | undefined
  leadFloristExperience?: string | undefined
  maxCapacityNormal?: string | undefined
  maxCapacityPeak?: string | undefined
  flowerSupply?: string | undefined
  mainFlowerSource?: string | undefined
  importFrequency?: string | undefined
  rareFlowerAbility?: string | undefined
  inboundProcess?: string | undefined
  freshnessDuration?: string | undefined
  lossRateEstimate?: string | undefined
  nearExpireHandling?: string | undefined
}

export interface PartnerStoreFacilityAndDelivery {
  coolers?: string | undefined
  coldStorage?: string | undefined
  premises?: string | undefined
  space?: string | undefined
  equipment?: string | undefined
  staffing?: string | undefined
  deliveryVehicles?: string | undefined
  deliveryRadius?: string | undefined
  deliveryCommitmentTime?: string | undefined
  coldDeliveryAbility?: string | undefined
  deliveryFeePolicy?: string | undefined
}

export interface PartnerStoreMedia {
  requiredPhotoTypes?: string | undefined
  /** URL ký có hạn của ảnh đã tải vào kho — chỉ có trong phản hồi đọc, không lưu. */
  coverPhotoUrl?: string | undefined
  photoGalleryUrls?: string[] | undefined
  rawImageUrls?: string | undefined
  driveImageIds: string[]
  requiredDocuments?: string | undefined
}

export interface PartnerStoreScoreAndTier {
  skillAndCraftScore?: string | undefined
  processFacilityScore?: string | undefined
  supplyStorageScore?: string | undefined
  productionDeliveryScore?: string | undefined
  legalDigitalScore?: string | undefined
  disciplineCooperationScore?: string | undefined
  totalScore?: string | undefined
  suggestedTier: string
  additionalNotes?: string | undefined
}

export interface PartnerStoreMarketplaceEntity {
  id: string
  audit: PartnerStoreAudit
  identity: PartnerStoreIdentity
  contact: PartnerStoreContact
  digital: PartnerStoreDigital
  business: PartnerStoreBusiness
  production: PartnerStoreProduction
  facilityAndDelivery: PartnerStoreFacilityAndDelivery
  media: PartnerStoreMedia
  scoreAndTier: PartnerStoreScoreAndTier
}
