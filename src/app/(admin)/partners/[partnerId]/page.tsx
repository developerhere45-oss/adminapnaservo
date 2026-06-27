import { StandalonePartnerProfile } from "@/components/module-page";

export default async function PartnerProfileRoute({ params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = await params;
  return <StandalonePartnerProfile partnerId={partnerId} />;
}
