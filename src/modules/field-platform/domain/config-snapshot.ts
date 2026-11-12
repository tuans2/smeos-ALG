/**
 * ALG Inputs Architecture v2.1 — Configuration Snapshot Engine
 *
 * Implements immutable frozen snapshot (§6.5) attached to orders / bookings.
 * Generates SHA-256 hash to verify immutability and detect tampering.
 */

import { createHash } from "crypto"

export interface SnapshotPolicyItem {
  readonly policyKey: string
  readonly effectiveValue: unknown
  readonly resolvedScope: string
  readonly provenance: readonly { readonly scope: string; readonly rawValue: unknown }[]
}

export interface SnapshotPriceComponent {
  readonly name: string
  readonly amountVnd: number
  readonly isTaxIncluded: boolean
}

export interface ConfigSnapshotData {
  readonly storeId: string
  readonly orderReferenceId: string
  readonly snapshotAt: string
  readonly registryVersion: string
  readonly taxRatePercent: number
  readonly priceComponents: readonly SnapshotPriceComponent[]
  readonly effectivePolicies: readonly SnapshotPolicyItem[]
  readonly approvedAiProposals?: readonly string[]
}

export interface ImmutableConfigSnapshot {
  readonly snapshotId: string
  readonly data: ConfigSnapshotData
  readonly contentHash: string
}

export function computeSnapshotHash(data: ConfigSnapshotData): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort())
  return createHash("sha256").update(serialized).digest("hex")
}

export function createConfigSnapshot(
  snapshotId: string,
  data: ConfigSnapshotData
): ImmutableConfigSnapshot {
  const contentHash = computeSnapshotHash(data)
  return {
    snapshotId,
    data: Object.freeze(data),
    contentHash,
  }
}

export function verifyConfigSnapshot(snapshot: ImmutableConfigSnapshot): boolean {
  const currentHash = computeSnapshotHash(snapshot.data)
  return currentHash === snapshot.contentHash
}
