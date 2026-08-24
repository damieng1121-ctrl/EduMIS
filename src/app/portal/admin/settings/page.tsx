"use client";

import { useEffect, useState } from "react";
import { TOGGLEABLE_NAV_ITEMS } from "@/components/portal-nav";

type Tenant = {
  name: string;
  logoUrl: string | null;
  brandColor: string;
  appName: string | null;
  sidebarColor: string | null;
  disabledNavItems: string[];
  urn: string | null;
};

export default function AdminSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [savingTenant, setSavingTenant] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoNonce, setLogoNonce] = useState(0);

  useEffect(() => {
    fetch("/api/admin/tenant").then((r) => r.json()).then(setTenant);
  }, []);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/tenant/logo", { method: "POST", body: form });
      if (res.ok) {
        setTenant({ ...tenant, logoUrl: "set" });
        setLogoNonce((n) => n + 1);
      }
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function removeLogo() {
    if (!tenant) return;
    setUploadingLogo(true);
    try {
      await fetch("/api/admin/tenant/logo", { method: "DELETE" });
      setTenant({ ...tenant, logoUrl: null });
      setLogoNonce((n) => n + 1);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveTenant() {
    if (!tenant) return;
    setSavingTenant(true);
    try {
      await fetch("/api/admin/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenant),
      });
    } finally {
      setSavingTenant(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">School details</h2>
        {tenant && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">School name</label>
              <input
                value={tenant.name}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">DfE URN (optional)</label>
              <input
                value={tenant.urn ?? ""}
                onChange={(e) => setTenant({ ...tenant, urn: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Logo</label>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                  {tenant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin-uploaded logo, not worth next/image's remote-loader setup
                    <img key={logoNonce} src={`/api/tenant/logo?v=${logoNonce}`} alt="School logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-500">None</span>
                  )}
                </div>
                <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  {uploadingLogo ? "Uploading…" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" className="hidden" disabled={uploadingLogo} onChange={uploadLogo} />
                </label>
                {tenant.logoUrl && (
                  <button onClick={removeLogo} disabled={uploadingLogo} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-700">Shown in the portal navigation bar. PNG, JPEG, SVG, WebP, or GIF, up to 2MB.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Brand colour</label>
              <input
                type="color"
                value={tenant.brandColor}
                onChange={(e) => setTenant({ ...tenant, brandColor: e.target.value })}
                className="mt-1 h-10 w-16 rounded-md border border-slate-300"
              />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium text-slate-700">App name (optional)</label>
              <input
                value={tenant.appName ?? ""}
                onChange={(e) => setTenant({ ...tenant, appName: e.target.value })}
                placeholder="EduMIS"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-700">
                Replaces the &quot;EduMIS&quot; wordmark in the nav header — for schools that want to fully rebrand.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(tenant.sidebarColor)}
                  onChange={(e) => setTenant({ ...tenant, sidebarColor: e.target.checked ? "#4338ca" : "" })}
                />
                Custom nav bar colour
              </label>
              {tenant.sidebarColor && (
                <input
                  type="color"
                  value={tenant.sidebarColor}
                  onChange={(e) => setTenant({ ...tenant, sidebarColor: e.target.value })}
                  className="mt-2 h-10 w-16 rounded-md border border-slate-300"
                />
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">Nav modules</p>
              <p className="mt-1 text-sm text-slate-700">Hide modules this school doesn&apos;t use from the staff navigation.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TOGGLEABLE_NAV_ITEMS.map((item) => (
                  <label key={item.href} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!tenant.disabledNavItems.includes(item.href)}
                      onChange={(e) =>
                        setTenant({
                          ...tenant,
                          disabledNavItems: e.target.checked
                            ? tenant.disabledNavItems.filter((h) => h !== item.href)
                            : [...tenant.disabledNavItems, item.href],
                        })
                      }
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={saveTenant}
              disabled={savingTenant}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingTenant ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
