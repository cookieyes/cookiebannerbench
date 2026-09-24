import { DetailPage } from "@/components/detail-page";
import { loadRun } from "@/data/source";
import { DEFAULT_SLICE } from "@/lib/config";
import { detailMetadata } from "@/lib/detail";
import { PUBLISHED } from "@/lib/published";

/**
 * The detail page for a test profile other than the default, so a reader who
 * opens an installation from the leaderboard lands on the profile they were
 * looking at. The default profile lives at /cmp/<app>/.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  const profiles = loadRun().profiles.filter((p) => p !== DEFAULT_SLICE.profile);
  return PUBLISHED.flatMap((p) => profiles.map((profile) => ({ app: p.app, profile })));
}
type Params = { params: Promise<{ app: string; profile: string }> };
export async function generateMetadata({ params }: Params) {
  const { app, profile } = await params;
  return detailMetadata(app, profile);
}
export default async function Page({ params }: Params) {
  const { app, profile } = await params;
  return <DetailPage app={app} profile={profile} />;
}
