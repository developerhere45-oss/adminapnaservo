import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { resourceConfig } from "@/lib/resource-config";

export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!resourceConfig[resource]) notFound();
  return <ModulePage resource={resource} />;
}
