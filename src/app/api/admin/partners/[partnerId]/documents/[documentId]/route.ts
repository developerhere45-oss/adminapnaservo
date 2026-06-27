import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

const schema = z.object({
  validationStatus: z.enum(["accepted", "rejected", "review"]),
});

type PartnerDocumentPayload = {
  id: string;
  documentType?: string;
  originalName?: string;
  mimeType?: string;
  url?: string;
};

type PartnerProfilePayload = {
  partner?: { profilePhoto?: string };
  documents?: PartnerDocumentPayload[];
};

function safeFileName(value: string) {
  return value.replace(/[^\w.-]+/g, "_") || "partner-document";
}

export async function GET(_request: Request, context: { params: Promise<{ partnerId: string; documentId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "technicians:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { partnerId, documentId } = await context.params;
  try {
    const profile = await fetchBackendJson<PartnerProfilePayload>(`/api/admin/partners/${encodeURIComponent(partnerId)}`);
    const document =
      documentId === "profile-photo"
        ? {
            id: "profile-photo",
            documentType: "profile_photo",
            originalName: "profile-photo.jpg",
            mimeType: "image/jpeg",
            url: profile.partner?.profilePhoto,
          }
        : profile.documents?.find((item) => item.id === documentId);

    if (!document?.url) return NextResponse.json({ message: "Document URL not available" }, { status: 404 });

    const fileResponse = await fetch(document.url);
    if (!fileResponse.ok) return NextResponse.json({ message: "Document download failed" }, { status: 502 });

    const contentType = document.mimeType || fileResponse.headers.get("content-type") || "application/octet-stream";
    const filename = safeFileName(document.originalName || `${document.documentType || "partner-document"}`);
    return new Response(await fileResponse.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Document download failed" }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ partnerId: string; documentId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "technicians:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid document status" }, { status: 400 });

  const { partnerId, documentId } = await context.params;
  try {
    const data = await fetchBackendJson(
      `/api/admin/partners/${encodeURIComponent(partnerId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "PATCH", body: JSON.stringify(body.data) },
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
