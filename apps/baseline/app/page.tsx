/**
 * The page under test. Deliberately trivial: every byte of LCP, TBT and CLS
 * this page reports should be attributable to the consent SDK, not to content.
 */
export default function Home() {
  return (
    <main>
      <h1>ConsentBench</h1>
    </main>
  );
}
