import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installCollector } from "../collector.js";

/**
 * The usability probe, against banners that behave badly on purpose.
 *
 * This runs a real browser because there is nothing to test otherwise: the
 * probe's entire job is to notice things only a layout engine knows — what is
 * painted over what, where an element is mid-transition, whether a click would
 * land. jsdom has no layout and returns null from `elementFromPoint`, so a unit
 * test there would pass against a probe that does nothing, which is exactly the
 * failure this replaces.
 *
 * Each case below is a banner that is *visible* well before it is *usable*. The
 * old check reported both in the same millisecond for every one of them.
 */

const FIXTURE = `<!doctype html>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>banner fixture</title>
<style>
  body { margin: 0; min-height: 200vh; font: 16px system-ui; }
  #banner { position: fixed; left: 0; right: 0; bottom: 0; padding: 24px; background: #eee; }
  #banner.slide { transform: translateY(150%); transition: transform 400ms linear; }
  #banner.slide.in { transform: translateY(0); }
  #banner.nopointer { pointer-events: none; }
  #overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); }
</style>
<p>Page content.</p>
<script>
  const CASE = new URLSearchParams(location.search).get("case");
  const BUTTON = '<button id="accept"><span>Accept all</span></button>';

  const banner = (inner) => {
    const el = document.createElement("div");
    el.id = "banner";
    el.innerHTML = inner;
    document.body.appendChild(el);
    return el;
  };
  const cover = () => {
    const el = document.createElement("div");
    el.id = "overlay";
    document.body.appendChild(el);
    return el;
  };

  if (CASE === "instant") {
    banner(BUTTON);
  } else if (CASE === "slide") {
    const el = banner(BUTTON);
    el.classList.add("slide");
    requestAnimationFrame(() => el.classList.add("in"));
  } else if (CASE === "covered") {
    banner(BUTTON);
    const overlay = cover();
    setTimeout(() => overlay.remove(), 600);
  } else if (CASE === "nopointer") {
    const el = banner(BUTTON);
    el.classList.add("nopointer");
    setTimeout(() => el.classList.remove("nopointer"), 500);
  } else if (CASE === "disabled") {
    const el = banner('<button id="accept" disabled>Accept all</button>');
    setTimeout(() => el.querySelector("#accept").removeAttribute("disabled"), 300);
  } else if (CASE === "late") {
    const el = banner("<p>We use cookies.</p>");
    setTimeout(() => { el.innerHTML += BUTTON; }, 700);
  } else if (CASE === "shadow") {
    const el = banner("<p>We use cookies.</p>");
    const host = document.createElement("div");
    el.appendChild(host);
    host.attachShadow({ mode: "open" }).innerHTML = BUTTON;
  } else if (CASE === "never") {
    banner(BUTTON);
    cover();
  } else if (CASE === "big-banner") {
    // A banner that is the largest thing on the page: raw LCP becomes the
    // banner's paint, content LCP must stay on the page's own paragraph.
    setTimeout(() => {
      const el = banner('<p style="font-size:64px;line-height:1.1">' + "Cookies ".repeat(40) + "</p>" + BUTTON);
      el.style.top = "0";
    }, 600);
  }
</script>
`;

let server: Server;
let browser: Browser;
let origin: string;

beforeAll(async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch({ headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

interface Timings {
  visible: number | null;
  usable: number | null;
}

/** Loads one case and reports the probe's two banner timestamps. */
async function timings(name: string, waitMs: number): Promise<Timings> {
  const page: Page = await browser.newPage();
  try {
    await installCollector(page, ["#banner"]);
    await page.goto(`${origin}/?case=${name}`, { waitUntil: "commit" });
    await page
      .waitForFunction(() => window.__cookiebannerbench?.bannerInteractive !== null, undefined, {
        timeout: waitMs,
        polling: 50,
      })
      .catch(() => undefined);
    return await page.evaluate(() => ({
      visible: window.__cookiebannerbench?.bannerVisible ?? null,
      usable: window.__cookiebannerbench?.bannerInteractive ?? null,
    }));
  } finally {
    await page.close();
  }
}

/** The gap the score cares about: how long the banner was visible but inert. */
async function gap(name: string, waitMs = 4000): Promise<number> {
  const { visible, usable } = await timings(name, waitMs);
  expect(visible, `${name}: banner never became visible`).not.toBeNull();
  expect(usable, `${name}: banner never became usable`).not.toBeNull();
  return (usable as number) - (visible as number);
}

describe("time to usable banner", () => {
  it("is within a frame of visible when the banner arrives ready", async () => {
    // The floor: nothing is animating, so the first clickable frame is accepted
    // without waiting for a second one to confirm the geometry.
    expect(await gap("instant")).toBeLessThan(50);
  }, 30_000);

  it("waits out a banner that slides into place", async () => {
    // Visible on its first frame, 400ms of travel before a tap would land.
    const measured = await gap("slide");
    expect(measured).toBeGreaterThan(300);
    expect(measured).toBeLessThan(700);
  }, 30_000);

  it("waits while the control is painted over", async () => {
    const measured = await gap("covered");
    expect(measured).toBeGreaterThan(500);
    expect(measured).toBeLessThan(900);
  }, 30_000);

  it("waits while the banner refuses pointer events", async () => {
    const measured = await gap("nopointer");
    expect(measured).toBeGreaterThan(400);
    expect(measured).toBeLessThan(800);
  }, 30_000);

  it("waits while the control is disabled", async () => {
    const measured = await gap("disabled");
    expect(measured).toBeGreaterThan(200);
    expect(measured).toBeLessThan(600);
  }, 30_000);

  it("waits for a control that hydrates late", async () => {
    // The shape of a banner whose markup paints before its framework mounts.
    const measured = await gap("late");
    expect(measured).toBeGreaterThan(600);
    expect(measured).toBeLessThan(1000);
  }, 30_000);

  it("finds a control inside a shadow root", async () => {
    // `elementFromPoint` stops at the host, so without the descent this case
    // looks exactly like a permanently covered control.
    expect(await gap("shadow")).toBeLessThan(50);
  }, 30_000);

  it("keeps the page's own largest paint separate from a banner that out-paints it", async () => {
    const page = await browser.newPage();
    try {
      await installCollector(page, ["#banner"]);
      await page.goto(`${origin}/?case=big-banner`, { waitUntil: "commit" });
      await page.waitForFunction(
        () => window.__cookiebannerbench?.bannerVisible !== null,
        undefined,
        {
          timeout: 4000,
        },
      );
      await page.waitForTimeout(400);
      const { lcp, contentLcp, visible } = await page.evaluate(() => ({
        lcp: window.__cookiebannerbench?.lcp ?? 0,
        contentLcp: window.__cookiebannerbench?.contentLcp ?? 0,
        visible: window.__cookiebannerbench?.bannerVisible ?? 0,
      }));
      // Raw LCP moved to the banner's paint; the host's own paint did not.
      expect(lcp).toBeGreaterThanOrEqual(visible - 50);
      expect(contentLcp).toBeLessThan(visible - 300);
      expect(contentLcp).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }, 30_000);

  it("reports unmeasured, not zero, when nothing ever becomes clickable", async () => {
    const { visible, usable } = await timings("never", 6500);
    expect(visible).not.toBeNull();
    expect(usable).toBeNull();
  }, 30_000);
});
