import type { MetricKey } from "@/lib/schema";
export interface GlossaryEntry {
  meaning: string;
  matters: string;
  good: string;
  capture: string;
}

/**
 * Partial by type, not by accident: a metric the collector records is not
 * automatically one the glossary has words for, and an empty stub would be
 * worse than an honest absence on a page whose whole claim is that every
 * number can be checked.
 */
export const GLOSSARY: Partial<Record<MetricKey, GlossaryEntry>> = {
  bannerVisible: {
    meaning:
      "Elapsed time from navigation until a configured banner selector is detected as visible.",
    matters:
      "How long a visitor waits to be asked. It is the whole of Banner Speed, 30% of the score.",
    good: "Lower is earlier. Scores 100 at 0 ms and 0 at 5 s or later.",
    capture:
      "A requestAnimationFrame probe checks visibility and non-zero bounds, then records performance.now(). Detection is not a separate pixel-paint measurement.",
  },
  bannerInteractive: {
    meaning:
      "Elapsed time from navigation until the banner first has a control a click would reach: an enabled button or link whose own centre passes a hit test, with nothing in its ancestry still animating.",
    matters:
      "A banner can be on screen before it can be acted on. A control that is covered, set to pointer-events: none, or still sliding into place will not respond to the tap it invites.",
    good: "Equal to time-to-banner means the banner was usable the moment it appeared. The gap between the two is scored in Visitor Experience: 100 at no gap, 0 at a second or more. It is never also counted in Banner Speed.",
    capture:
      "Per frame after detection: document.elementFromPoint at each candidate control's centre, descending through shadow roots, accepting the control or a descendant of it but not an ancestor. Accepted immediately when no ancestor reports a running animation, otherwise when the control's geometry is unchanged from the previous frame. Null if nothing becomes clickable within 5s of detection — unmeasured, not zero.",
  },
  wireBytes: {
    meaning:
      "Every byte that crossed the network for this page load, headers included, compressed as sent, recorded from outside the page over the DevTools protocol.",
    matters:
      "It is the figure Network Cost scores. The page's own view of the same load reports zero for cross-origin responses whose server withholds Timing-Allow-Origin, which is every vendor-script installation here — so on that view the vendors that disclose least would look lightest.",
    good: "Scored as the increase over the no-SDK control: 100 at nothing added, 0 at 250 KB or more.",
    capture:
      "encodedDataLength from Network.loadingFinished, summed over completed http(s) requests. Redirects count as their own entries; failed and aborted requests are excluded rather than counted as zero; data: and blob: URLs never crossed a wire and are skipped. The navigation document is included, which Resource Timing excludes — both sides of the control comparison are counted the same way.",
  },
  wireRequests: {
    meaning: "Completed network requests the page made, as the protocol counted them.",
    matters:
      "Each request is at least a round trip and a slot in the browser's connection queue, whatever its size.",
    good: "Scored as the increase over the no-SDK control: 100 at none added, 0 at 20 or more.",
    capture: "Count of the requests summed for wireBytes.",
  },
  wireThirdPartyBytes: {
    meaning: "Wire bytes that came from an origin other than the page's own.",
    matters:
      "On this page the only third party is the consent vendor, so this is a second, independent derivation of the bytes Network Cost already charges — which is why it is reported rather than scored twice.",
    good: "Zero means the consent layer was served from the page's own origin.",
    capture: "wireBytes restricted to requests whose origin is not the page's.",
  },
  wireVendorBytes: {
    meaning: "Wire bytes from the hosts the installation declares as the vendor's own.",
    matters:
      "Separates the vendor's bundle from anything else a third party contributed. Where it is lower than third-party bytes, the gap is another party the consent script pulled in.",
    good: "Not scored. A self-hosted install legitimately reports zero, which is why this explains the bytes figure rather than replacing it.",
    capture:
      "wireBytes restricted to the app's declared serviceHosts, matched on host and parent domains.",
  },
  wireVendorRequests: {
    meaning: "Requests to the vendor's own hosts.",
    matters:
      "Non-zero with zero vendor bytes used to mean the sizes were hidden; measured over the wire, the bytes are now there too.",
    good: "No threshold.",
    capture: "Count of the requests summed for wireVendorBytes.",
  },
  contentLcp: {
    meaning: "Largest Contentful Paint with every entry belonging to the banner excluded.",
    matters:
      "The page's own largest paint — the cost the host pays — separated from the banner's. On this test page it lands on first paint, which is why first-paint delay is what the score uses.",
    good: "Reported, not scored.",
    capture:
      "The same largest-contentful-paint observer as LCP, skipping an entry whose element sits inside the banner, climbing out of shadow roots. Decided when the entry is observed, while its element is still attached.",
  },
  wireThirdPartyOrigins: {
    meaning: "Distinct hosts other than the page's own that the load contacted.",
    matters:
      "Reported, not scored. It was scored in a draft of this method and withdrawn: the time, bytes and requests those hosts cost are already scored, and what was left scored every self-hosted install a perfect hundred for being self-hosted.",
    good: "No threshold. Zero means the consent layer was served from the page's own origin.",
    capture: "Distinct URL hosts among completed wire requests not on the page's origin.",
  },
  bannerLayoutShift: {
    meaning: "Layout-shift total accumulated after the banner is first detected.",
    matters: "Shows movement in the part of the measurement window after the banner arrives.",
    good: "Zero means no recorded shift in that window; this metric has no separate standard threshold.",
    capture:
      "The collector subtracts the CLS total at banner detection from the final total. Other late content can contribute: this is a timing attribution, not proof of causation.",
  },
  bannerViewportCoverage: {
    meaning: "Banner bounding-box area divided by the viewport area at detection.",
    matters: "How much of the page the question hides while it waits for an answer.",
    good: "Scored in Visitor Experience: 100 at 0 %, 0 at half the screen or more. A smaller banner is not automatically a better consent interface; this measures only what it covers.",
    capture:
      "getBoundingClientRect() width × height divided by window.innerWidth × window.innerHeight. The bounding box is not clipped to the visible viewport.",
  },
  lcp: {
    meaning:
      "Largest Contentful Paint: the latest observed timestamp for the largest eligible content element.",
    matters:
      "Reported, not scored. When the banner is the largest thing on screen it is the LCP element, so a fast banner makes LCP later and a slow one leaves it early — scoring it would reward arriving late.",
    good: "The published Core Web Vitals good threshold is at most 2,500 ms. These are lab page loads, not field assessment.",
    capture:
      "A buffered largest-contentful-paint PerformanceObserver retains the largest startTime until collection ends.",
  },
  fcp: {
    meaning:
      "First Contentful Paint: when the browser first paints text, an image or other content.",
    matters:
      "A consent script that loads synchronously holds up the page's first paint. It is the most independent cost in the score: it barely tracks any other measurement.",
    good: "Scored as first-paint delay, the increase over the no-SDK control: 100 at no delay, 0 at 3 s — the Core Web Vitals poor line — or more.",
    capture: "The first first-contentful-paint entry from a buffered paint PerformanceObserver.",
  },
  cls: {
    meaning: "The collector’s accumulated layout-shift values during the measurement window.",
    matters:
      "Reported, not scored. Every banner here is a fixed overlay, so nothing below it moves: 0.000 for all but one installation. Scored, it would hand every row a free hundred.",
    good: "The standard CLS good boundary is at most 0.1, but this collector sums the whole window rather than using the standard largest session window.",
    capture:
      "A layout-shift PerformanceObserver sums entries without recent user input. This lab accumulator must not be presented as a field CLS assessment.",
  },
  tbt: {
    meaning: "Total observed long-task duration beyond the first 50 ms of each task.",
    matters: "Time the page cannot respond to a tap or a click because a script is busy.",
    good: "Scored in Page Impact as the increase over the no-SDK control: 100 at none added, 0 at 600 ms — the Core Web Vitals poor line — or more.",
    capture:
      "A longtask observer sums max(0, duration − 50 ms) throughout collection, not just the Lighthouse FCP-to-TTI window. This is not INP.",
  },
  tti: {
    meaning: "A lab approximation of the time after the last observed long task.",
    matters:
      "Reported, not scored: it moves almost exactly with blocking time, which is scored, so scoring both would charge the same long tasks twice.",
    good: "Lower is earlier, but this approximation has no validated good threshold.",
    capture:
      "The maximum of FCP, DOMContentLoaded end and last-long-task end. This is not the retired Lighthouse TTI algorithm.",
  },
  transferBytes: {
    meaning: "Sum of resource sizes exposed to the collector, excluding the navigation document.",
    matters:
      "Reported beside the wire figure, which is what the score uses. The difference between the two is exactly what a vendor's host withheld from the page.",
    good: "Not scored. Cross-origin restrictions mean this is not complete network traffic, which is why it was replaced.",
    capture:
      "Resource Timing entries contribute transferSize, falling back to encodedBodySize, then zero. Cache hits may therefore still contribute body bytes; unexposed cross-origin sizes can remain zero.",
  },
  thirdPartyBytes: {
    meaning: "Recorded resource bytes for URLs that do not begin with the page origin.",
    matters:
      "Shows the visible portion of resource weight classified as external by the collector.",
    good: "No universal passing value. Zero recorded bytes does not demonstrate no third-party requests.",
    capture:
      "Filters resource names with !name.startsWith(location.origin), then uses the same size fallback as transfer. This is a string-prefix classification, not a parsed-origin comparison.",
  },
  requestCount: {
    meaning: "Number of Resource Timing entries collected for the page.",
    matters: "Shows how many resource entries were observed, including cached resources.",
    good: "Fewer entries can mean less loading work, but entry count is not a quality grade.",
    capture:
      "performance.getEntriesByType('resource').length. Excludes the navigation document and is not a full network log.",
  },
  scriptLoadMs: {
    meaning: "Sum of durations for resource entries initiated as scripts.",
    matters: "Describes aggregate script-resource loading duration.",
    good: "Lower is less aggregate duration. Parallel loads overlap, so this is not elapsed page-load time.",
    capture:
      "Filters Resource Timing by initiatorType === 'script' and sums duration. Does not measure JavaScript execution time.",
  },
};
