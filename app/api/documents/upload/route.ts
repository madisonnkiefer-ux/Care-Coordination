import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { authorizeMemberAccess } from "@/lib/dal";

// Client-side direct-to-Blob upload (bypasses the serverless function body
// size limit, which matters for scanned multi-page PDFs). The browser gets
// a short-lived signed token from here, uploads straight to Blob storage,
// then calls saveDocument (app/actions/documents.ts) with the resulting URL
// to create the Document record — onUploadCompleted below is best-effort
// only, since Vercel can't reach this route's webhook from local dev.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const memberId = clientPayload ? (JSON.parse(clientPayload).memberId as string) : null;
        if (!memberId) throw new Error("Missing memberId");

        const { member } = await authorizeMemberAccess(memberId);
        if (!member) throw new Error("Forbidden");

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ memberId }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
