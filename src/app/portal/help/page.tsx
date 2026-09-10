"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MODULE_THEME } from "@/lib/module-theme";
import { HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/help-articles";
import { Search, Mail } from "lucide-react";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@edumis.app";

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.steps.some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        module="settings"
        title="Help & guides"
        subtitle="How-to guides for every module. Can't find what you need? Email support and we'll help you out."
      />

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No guides match that search"
          description="Try a different word, or email support directly."
          action={
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            >
              <Mail size={14} className="shrink-0" />
              {SUPPORT_EMAIL}
            </a>
          }
        />
      ) : (
        HELP_CATEGORIES.map((category) => {
          const articles = filtered.filter((a) => a.category === category);
          if (articles.length === 0) return null;
          return (
            <section key={category} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{category}</h2>
              <div className="space-y-3">
                {articles.map((article) => {
                  const { icon: Icon, badge } = MODULE_THEME[article.module];
                  return (
                    <details
                      key={article.slug}
                      className="group rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${badge}`}>
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-900 dark:text-white">{article.title}</span>
                          <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{article.summary}</span>
                        </span>
                      </summary>
                      <ol className="ml-11 mt-3 list-decimal space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                        {article.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="font-medium text-slate-900 dark:text-white">Still stuck?</p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Email support and we&apos;ll help you out directly.</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 font-medium text-white transition-colors hover:bg-indigo-600"
        >
          <Mail size={14} className="shrink-0" />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
