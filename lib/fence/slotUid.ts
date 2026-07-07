import type { FenceStackSlot } from "@/lib/types";

export function createSlotUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ensureSlotUids(stack: FenceStackSlot[]): FenceStackSlot[] {
  return stack.map((slot) => ({
    ...slot,
    uid: slot.uid ?? createSlotUid(),
  }));
}

export function stripSlotUids(stack: FenceStackSlot[]): FenceStackSlot[] {
  return stack.map(({ blockId, mode, gapCm, mirrorsMain }) => ({
    blockId,
    mode,
    ...(gapCm != null ? { gapCm } : {}),
    ...(mirrorsMain ? { mirrorsMain: true } : {}),
  }));
}
