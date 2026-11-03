import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { members } from "@/server/db/schema";
import { sameOrigin } from "@/server/member-request";
import { memberOfFileKey, storeUploadBody, uploadTokenOptions } from "@/server/reprocann-files";
import { documentStorage, uploadMode } from "@/server/storage";

// Documentation the association already received, on its way to the member's folder of the private
// storage. Admins only; the file is checked again, with the identity, when the admin confirms the load.

const status = (code: number) => new Response(null, { status: code });

async function existingMember(key: string) {
  const memberId = memberOfFileKey(key);
  if (!memberId) return false;
  const [m] = await (await getDb()).select({ id: members.id }).from(members).where(eq(members.id, memberId));
  return !!m;
}

export async function POST(request: Request) {
  if (uploadMode() !== "blob" || !sameOrigin(request)) return status(404);
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token") return status(400);
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdmin();
        if (!(await existingMember(pathname))) throw new Error("not allowed");
        return uploadTokenOptions();
      },
    });
    return Response.json(result);
  } catch {
    return status(403);
  }
}

export async function PUT(request: Request) {
  if (uploadMode() !== "local" || !sameOrigin(request)) return status(404);
  await requireAdmin();
  const key = new URL(request.url).searchParams.get("clave") ?? "";
  if (!(await existingMember(key))) return status(400);
  const storage = documentStorage();
  if (!storage) return status(404);
  return status(await storeUploadBody(request, storage, key));
}
