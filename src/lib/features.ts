/**
 * Optional modules a school can switch on from Super Admin, on top of the
 * core feature set every tenant already gets. Stored as a plain string[] on
 * Tenant.enabledFeatures (see schema.prisma) — this file is the single
 * source of truth for what those strings mean.
 */
export type FeatureKey = "CTF_EXCHANGE" | "SCR" | "CENSUS_EXTENDED" | "WONDE";

export const FEATURE_KEYS: FeatureKey[] = ["CTF_EXCHANGE", "SCR", "CENSUS_EXTENDED", "WONDE"];

export const FEATURE_INFO: Record<FeatureKey, { label: string; description: string }> = {
  CTF_EXCHANGE: {
    label: "CTF exchange",
    description: "Export/import pupil records in the DfE Common Transfer File format for school-to-school moves.",
  },
  SCR: {
    label: "Single Central Record",
    description: "The KCSIE-required staff vetting record (DBS, right to work, barred list, prohibition checks).",
  },
  CENSUS_EXTENDED: {
    label: "Extended census",
    description: "Exclusions, EYFS Profile, and the wider School Census data items beyond pupil/attendance basics.",
  },
  WONDE: {
    label: "Wonde integration",
    description: "Sync rosters/timetables to third-party apps via Wonde. Requires the school's own Wonde partner credentials.",
  },
};

export function hasFeature(enabledFeatures: string[] | null | undefined, key: FeatureKey): boolean {
  return Boolean(enabledFeatures?.includes(key));
}
