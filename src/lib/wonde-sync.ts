/**
 * Stub for the future Wonde roster sync connector.
 *
 * Not implemented yet — this file exists only to show the shape the real
 * sync job will take once a school has a live Wonde partner token stored on
 * its WondeConnection row. Nothing in the app calls this to pretend a sync
 * happened; the settings UI keeps "Sync now" disabled until this is built.
 */
export async function syncTenantRoster(tenantId: string): Promise<never> {
  void tenantId;
  throw new Error("Wonde sync not yet implemented — see WondeConnection for stored credentials");
}
