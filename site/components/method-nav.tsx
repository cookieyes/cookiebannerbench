import type { ReactNode } from "react";

/**
 * "How we test" is one page in three parts: the scoring model, what is
 * published, and the known limits.
 *
 * They are tabs, not routes. The whole method is one document — one thing to
 * search, print and link — and two of the three parts are too short to carry a
 * page of their own. So every part is server-rendered into the document and the
 * switcher is a set of ordinary links to them. Without JavaScript that is a
 * table of contents over one long page and nothing is unreachable; enhance.js
 * turns it into a tab strip, hiding the parts you are not reading and opening
 * whichever part a deep link points into.
 */
export const METHOD_TABS = [
  { id: "tab-scoring", label: "Scoring model" },
  { id: "tab-published", label: "What is published" },
  { id: "tab-limits", label: "Known limits" },
] as const;

export function MethodTabs() {
  return (
    <nav className="subnav" aria-label="How we test" data-method-tabs="true">
      {METHOD_TABS.map((t, i) => (
        <a key={t.id} href={`#${t.id}`} aria-current={i === 0 ? "page" : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

/** One part of the method. Its sections number from 01 within it. */
export function MethodPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="doc-panel" id={id} data-method-panel="true">
      {children}
    </div>
  );
}
