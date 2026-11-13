/**
 * Coordinator Domain Types (Pure TypeScript - No Prisma or UI Imports).
 * Quản lý vòng đời điều phối đơn hàng và tháp điều phối (Control Tower).
 */

import type {
  DemUnit,
  FlowerBomItem,
  FoliageBomItem,
  WrappingLayer,
  AccessoryBomItem,
  StructuredAddress,
} from "@/modules/products/domain/product-master-index"
import type { CustomerTier } from "@/modules/crm/domain/customer-master-index"
import type { OrderStatus, ProductionStatus, DeliveryStatus } from "@/modules/orders/domain/order-types"

export type CoordinatorStage =
  | "INTAKE"
  | "VALIDATING"
  | "PLANNING"
  | "ASSIGNING"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "DISPATCHING"
  | "DELIVERED"
  | "COMPLETED"
  | "EXCEPTION"
  | "CANCELLED"

export type CoordinationRiskLevel = "NORMAL" | "ATTENTION" | "AT_RISK" | "CRITICAL"

export type QCRecordStatus = "PENDING" | "PASSED" | "REJECTED" | "REWORK_REQUESTED"

export interface PartnerRecord {
  id: string
  organizationId: string
  code: string
  name: string
  phone: string
  address?: string | null
  district?: string | null
  province?: string | null
  tier: "STANDARD" | "PREFERRED" | "VIP"
  rating: number
  capacityDaily: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrderCoordinationRecord {
  id: string
  organizationId: string
  orderId: string
  partnerId?: string | null
  coordinatorId?: string | null
  stage: CoordinatorStage
  riskLevel: CoordinationRiskLevel
  riskReason?: string | null
  nextAction?: string | null
  nextActionDue?: Date | null
  estimatedDeliveryAt?: Date | null
  actualDeliveryAt?: Date | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  partner?: PartnerRecord | null
}

export interface QCInspectionRecord {
  id: string
  organizationId: string
  orderId: string
  inspectorId?: string | null
  status: QCRecordStatus
  aiScore?: number | null
  aiCritique?: string | null
  imageUrls: string[]
  checklistResult?: {
    flowerMatchScore: number
    colorToneMatch: boolean
    wrappingMatch: boolean
    ribbonMatch: boolean
    cardMessageAccurate: boolean
  } | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderExceptionRecord {
  id: string
  organizationId: string
  orderId: string
  code: string
  type: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  resolution?: string | null
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED"
  reportedBy?: string | null
  resolvedBy?: string | null
  resolvedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface FloristProductionCardData {
  orderId: string
  orderCode: string
  recipeTitle: string
  targetReadyTime: string
  deliveryAddress: StructuredAddress | string
  cardMessage?: string | null | undefined
  internalNote?: string | null | undefined
  flowers: FlowerBomItem[]
  foliage: FoliageBomItem[]
  wrapping: WrappingLayer[]
  accessories: AccessoryBomItem[]
  sampleImageUrl?: string | null | undefined
}
