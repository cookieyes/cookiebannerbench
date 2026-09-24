import { DetailPage } from "@/components/detail-page";
import { detailMetadata } from "@/lib/detail";
import { PUBLISHED } from "@/lib/published";
export const dynamicParams = false;
export function generateStaticParams() {
  return PUBLISHED.map((p) => ({ app: p.app }));
}
export async function generateMetadata({ params }: { params: Promise<{ app: string }> }) {
  return detailMetadata((await params).app);
}
export default async function Page({ params }: { params: Promise<{ app: string }> }) {
  return <DetailPage app={(await params).app} />;
}
