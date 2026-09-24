const enhance = () => {
  const root = document.documentElement;

  /* ── Theme: three real buttons ──────────────────────────────────────── */
  const themeButtons = [...document.querySelectorAll("[data-theme-toggle] button")];
  const markTheme = (theme) => {
    for (const b of themeButtons) b.setAttribute("aria-pressed", String(b.dataset.theme === theme));
  };
  markTheme(root.getAttribute("data-theme") || "system");
  for (const b of themeButtons) {
    b.disabled = false;
    b.addEventListener("click", () => {
      const theme = b.dataset.theme;
      if (theme === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", theme);
      try {
        if (theme === "system") localStorage.removeItem("cookiebannerbench-theme");
        else localStorage.setItem("cookiebannerbench-theme", theme);
      } catch {
        /* The theme still applies for this visit. */
      }
      markTheme(theme);
    });
  }

  /* ── How we test: one page, three parts ─────────────────────────────────
     Every part is in the document already, so without this the page is one
     long read and the switcher is a list of links into it. With this the
     switcher becomes a tab strip: the part you are reading is shown, the
     others are hidden, and a link into any of them opens the right one. */
  const strip = document.querySelector("[data-method-tabs]");
  if (strip) {
    const tabs = [...strip.querySelectorAll("a")];
    const panels = [...document.querySelectorAll("[data-method-panel]")];
    /** The part a fragment points at: a part itself, or whatever contains it. */
    const partFor = (hash) => {
      if (!hash || hash.length < 2) return null;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      return target ? target.closest("[data-method-panel]") : null;
    };
    const show = (panel, focus) => {
      const open = panel ?? panels[0];
      for (const p of panels) p.hidden = p !== open;
      for (const t of tabs) {
        const on = t.getAttribute("href") === `#${open.id}`;
        if (on) t.setAttribute("aria-current", "page");
        else t.removeAttribute("aria-current");
      }
      // Moving focus into the part that just opened keeps the keyboard and the
      // screen reader with the reader rather than at the top of the document.
      if (focus) {
        const heading = open.querySelector("h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
    };
    strip.dataset.live = "true";
    show(partFor(location.hash), false);
    strip.addEventListener("click", (event) => {
      const tab = event.target.closest("a");
      if (!tab || !tabs.includes(tab)) return;
      event.preventDefault();
      const panel = document.getElementById(tab.getAttribute("href").slice(1));
      show(panel, true);
      // A part is a place, so it goes in the address bar and in history.
      history.pushState(null, "", tab.getAttribute("href"));
    });
    // A link from elsewhere on the page, or the back button, opens its part
    // and then scrolls to what it actually pointed at.
    const follow = () => {
      const panel = partFor(location.hash);
      if (!panel) return;
      show(panel, false);
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && target !== panel) target.scrollIntoView();
    };
    window.addEventListener("hashchange", follow);
    window.addEventListener("popstate", follow);
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href*="#"]');
      if (!link || strip.contains(link)) return;
      const url = new URL(link.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      const panel = partFor(url.hash);
      if (panel) show(panel, false);
    });
  }

  /* ── Leaderboard ────────────────────────────────────────────────────── */
  const setText = (el, text) => {
    if (el && el.textContent !== text) el.textContent = text;
  };
  for (const board of document.querySelectorAll(".leaderboard")) {
    let sort = "score";
    let dir = "desc";
    /** Results regions by "profile|cache|percentile", fetched once each. */
    const slices = new Map();
    const region = () => board.querySelector(".results-region");
    // The conditions, the search box and the column picker all live inside the
    // region that a condition change replaces, so every one of them is looked
    // up fresh rather than held from setup.
    const control = (name) => region().querySelector(`[name=${name}]`);
    const query = () => control("query");
    const mobileMetric = () => control("mobile-metric");
    const picker = () => region().querySelector(".col-picker");
    // Every run is cold-cache only, so there is no cache control; the cache
    // part of the key is read off the region itself.
    const selectedKey = () =>
      [
        control("profile").value,
        region().dataset.condition.split("|")[1],
        control("percentile").value,
      ].join("|");
    /** Put a region's own selects back to the condition it renders, before it is cached. */
    const rewind = (r) => {
      const [profile, , percentile] = r.dataset.condition.split("|");
      const set = (name, value) => {
        const el = r.querySelector(`[name=${name}]`);
        if (el) el.value = value;
      };
      set("profile", profile);
      set("percentile", percentile);
    };
    /**
     * A condition change replaces the region the control lives in, so what the
     * reader had — their search text and their place in the tab order — has to
     * be read off the outgoing region *before* it is detached, then put back on
     * the incoming one. Detaching a focused element moves focus to the body, so
     * reading it afterwards is already too late.
     */
    const hold = (from) => {
      const focused = document.activeElement;
      const search = from.querySelector("[name=query]");
      return {
        query: search ? search.value : null,
        focus: focused && from.contains(focused) ? focused.name || null : null,
      };
    };
    const restore = (to, held) => {
      const search = to.querySelector("[name=query]");
      if (search && held.query !== null) search.value = held.query;
      if (!held.focus) return;
      const next = to.querySelector(`[name=${held.focus}]`);
      if (!next) return;
      next.disabled = false;
      next.focus();
      if (next === search) {
        const at = next.value.length;
        try {
          next.setSelectionRange(at, at);
        } catch {
          /* A search input may refuse a selection range; the value is what matters. */
        }
      }
    };
    const enable = () => {
      for (const c of board.querySelectorAll("button,input,select"))
        if (!c.closest(".locked")) c.disabled = false;
    };

    /** Column choice: the picker's checkboxes are the source of truth once touched. */
    const columnSet = () =>
      new Set(
        [...board.querySelectorAll("[name=col]")].filter((c) => c.checked).map((c) => c.value),
      );
    const applyColumns = () => {
      const custom = board.dataset.cols === "custom";
      const shown = columnSet();
      const all = [...board.querySelectorAll("[name=col]")].map((c) => c.value);
      for (const cell of region().querySelectorAll("[data-metric]")) {
        const key = cell.dataset.metric;
        if (custom) cell.hidden = !shown.has(key) && key !== "score";
      }
      setText(
        board.querySelector("[data-col-summary]"),
        `Columns · ${all.length - shown.size} hidden`,
      );
    };
    /** Below 640 the reader picks the one metric that shows beside provider and score. */
    const applyMobile = () => {
      const chosen = mobileMetric();
      if (!chosen) return;
      for (const cell of region().querySelectorAll("[data-metric]"))
        if (cell.dataset.metric === chosen.value) cell.dataset.mobile = "true";
        else delete cell.dataset.mobile;
    };

    const update = () => {
      const r = region();
      r.removeAttribute("aria-busy");
      const search = query();
      const needle = search ? search.value.trim().toLowerCase() : "";
      // Header state.
      for (const th of r.querySelectorAll("thead [data-metric]")) {
        const active = th.dataset.metric === sort;
        th.setAttribute(
          "aria-sort",
          active ? (dir === "desc" ? "descending" : "ascending") : "none",
        );
        setText(th.querySelector(".arrow"), active ? (dir === "desc" ? "↓" : "↑") : "");
      }
      // Order, rank, search.
      const body = r.querySelector("tbody");
      const items = [...body.children];
      const values = new Map(items.map((tr) => [tr, JSON.parse(tr.dataset.values)]));
      items.sort((a, b) => {
        const control = Number(a.dataset.control === "true") - Number(b.dataset.control === "true");
        if (control) return control;
        const av = values.get(a)[sort];
        const bv = values.get(b)[sort];
        if (typeof av === "string" || typeof bv === "string")
          return (
            String(av ?? "").localeCompare(String(bv ?? "")) ||
            a.dataset.app.localeCompare(b.dataset.app)
          );
        // Unmeasured sorts last whichever way the column runs; a dash is not a small number.
        if (av == null && bv == null) return a.dataset.app.localeCompare(b.dataset.app);
        if (av == null) return 1;
        if (bv == null) return -1;
        return (dir === "desc" ? bv - av : av - bv) || a.dataset.app.localeCompare(b.dataset.app);
      });
      let count = 0;
      let position = 0;
      let rank = 0;
      let previous;
      for (const tr of items) {
        const isControl = tr.dataset.control === "true";
        const v = values.get(tr)[sort];
        if (!isControl && v != null) {
          position++;
          if (position === 1 || v !== previous) rank = position;
          previous = v;
        }
        setText(tr.querySelector(".rank"), isControl || v == null ? "—" : String(rank));
        const hide = !tr.dataset.search.includes(needle);
        if (tr.hidden !== hide) tr.hidden = hide;
        if (!hide) count++;
      }
      if (items.some((tr, i) => body.children[i] !== tr))
        for (const tr of items) body.appendChild(tr);
      const countEl = board.querySelector(".result-count");
      setText(countEl, `${count} of ${items.length} installations`);
      // Always announced; shown only when a search has narrowed the field.
      if (countEl) countEl.dataset.filtered = String(count !== items.length);
      const empty = r.querySelector(".empty-state");
      if (empty) empty.hidden = count !== 0;
      const label = r.querySelector(`[data-sort="${sort}"]`);
      const name = label ? label.textContent.replace(/, select to sort|[↕↑↓]/g, "").trim() : sort;
      const [profile, cache, percentile] = r.dataset.condition.split("|");
      setText(
        r.querySelector("caption"),
        `Run ${board.dataset.run}; ${profile.replace("-", " ")} · ${cache} cache · ${percentile}. Sorted by ${
          sort === "score" ? "score" : name.toLowerCase()
        }, ${dir === "desc" ? "highest" : "lowest"} first. Each value is the ${percentile} of ${
          r.dataset.loads || 20
        } loads; intervals and every load are on the detail page.`,
      );
      applyColumns();
      applyMobile();
      enable();
    };

    board.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button?.dataset.sort) {
        if (sort === button.dataset.sort) dir = dir === "desc" ? "asc" : "desc";
        else {
          sort = button.dataset.sort;
          dir = button.dataset.dir || "asc";
        }
        update();
        return;
      }
      if (button?.dataset.chartTab) {
        const r = board;
        for (const tab of r.querySelectorAll("[data-chart-tab]")) {
          const on = tab === button;
          tab.classList.toggle("active", on);
          tab.setAttribute("aria-pressed", String(on));
        }
        for (const chart of r.querySelectorAll("[data-chart]"))
          chart.hidden = chart.dataset.chart !== button.dataset.chartTab;
        return;
      }
      // The whole row is the target; the provider name is the link.
      const row = event.target.closest("tbody tr");
      if (row && !event.target.closest("a") && !event.defaultPrevented) {
        const link = row.querySelector(".identity a");
        if (link) {
          if (event.metaKey || event.ctrlKey) window.open(link.href, "_blank", "noopener");
          else location.assign(link.href);
        }
      }
    });

    board.addEventListener("change", (event) => {
      const name = event.target.name;
      if (name === "col") {
        board.dataset.cols = "custom";
        applyColumns();
        return;
      }
      if (name === "mobile-metric") {
        applyMobile();
        return;
      }
      if (!["profile", "percentile"].includes(name)) return;
      const key = selectedKey();
      const current = region();
      if (current.dataset.condition === key) {
        current.removeAttribute("aria-busy");
        return;
      }
      // The other conditions are the same server-rendered markup, served as
      // fragments. The element being swapped out is kept so it is never refetched.
      const cached = slices.get(key);
      if (cached) {
        const held = hold(current);
        slices.set(current.dataset.condition, current);
        current.replaceWith(cached);
        rewind(current);
        restore(cached, held);
        update();
        return;
      }
      // Controls stay enabled while a fragment loads — disabling a focused
      // select drops keyboard focus. A response only applies if it is still the
      // condition the selects describe when it arrives.
      current.setAttribute("aria-busy", "true");
      // The clean, trailing-slash URL: hosts such as Vercel serve an exported
      // `<key>.html` there and answer the `.html` path itself with a 404.
      fetch(`/slices/${board.dataset.run}/${key.replaceAll("|", "_")}/`)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.text();
        })
        .then((html) => {
          const holder = document.createElement("template");
          holder.innerHTML = html;
          const next = holder.content.querySelector(".results-region");
          if (!next) throw new Error("fragment without results");
          slices.set(key, next);
          if (selectedKey() !== key) return;
          const live = region();
          const held = hold(live);
          slices.set(live.dataset.condition, live);
          live.replaceWith(next);
          rewind(live);
          restore(next, held);
          update();
        })
        .catch(() => {
          if (selectedKey() !== key) return;
          const live = region();
          rewind(live);
          live.removeAttribute("aria-busy");
        });
    });

    board.addEventListener("input", (event) => {
      if (event.target.name === "query") update();
    });
    // Close the column picker on Escape and return focus to its trigger.
    board.addEventListener("keydown", (event) => {
      const open = picker();
      if (event.key === "Escape" && open?.open) {
        open.open = false;
        open.querySelector("summary").focus();
      }
    });
    document.addEventListener("click", (event) => {
      const open = picker();
      if (open?.open && !open.contains(event.target)) open.open = false;
    });
    enable();
    update();
    // A detail page links back with ?profile=, so the reader returns to the
    // test profile they left rather than the default one.
    const wanted = new URLSearchParams(location.search).get("profile");
    const profile = control("profile");
    if (
      wanted &&
      profile &&
      wanted !== profile.value &&
      [...profile.options].some((o) => o.value === wanted)
    ) {
      profile.value = wanted;
      profile.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
};

// The export ships no React, so this runs at once. Under `next dev` the page
// still hydrates; mutating it first would only produce hydration-mismatch
// noise in the overlay, so wait for the root to be claimed (or ~10 s), then run.
if (Array.isArray(self.__next_f)) {
  let attempts = 0;
  const claimed = (node) => Object.keys(node).some((k) => k.startsWith("__reactFiber"));
  const hydrated = () =>
    [...document.querySelectorAll(".results-region, [data-theme-toggle]"), document.body].every(
      claimed,
    );
  const tick = () => (hydrated() || attempts++ > 200 ? enhance() : setTimeout(tick, 50));
  tick();
} else {
  enhance();
}
