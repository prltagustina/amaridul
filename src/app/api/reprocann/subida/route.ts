import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { activeMemberOfRequest, sameOrigin } from "@/server/member-request";
import { isMemberFileKey, storeUploadBody, uploadTokenOptions } from "@/server/reprocann-files";
import { documentStorage, uploadMode } from "@/server/storage";

// A member's credential on its way to private storage. The server checks the file again when the
// member confirms the upload (registerUploadAction); here it only decides who may send it where.

const status = (code: number) => new Response(null, { status: code });

/**
 * Deployments: the browser asks for a short-lived permission to put one file, of up to 10 MB and of
 * an accepted type, in the member's own folder of the private store; then it sends the file there.
 */
export async function POST(request: Request) {
  if (uploadMode() !== "blob" || !sameOrigin(request)) return status(404);
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token") return status(400);
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const who = await activeMemberOfRequest();
        if (!who || !isMemberFileKey(pathname, who.memberId)) throw new Error("not allowed");
        return uploadTokenOptions();
      },
    });
    return Response.json(result);
  } catch {
    return status(403);
  }
}

/** Development machine: the file comes to this server, which keeps it in the private local folder. */
export async function PUT(request: Request) {
  if (uploadMode() !== "local" || !sameOrigin(request)) return status(404);
  const who = await activeMemberOfRequest();
  if (!who) return status(404);
  const key = new URL(request.url).searchParams.get("clave") ?? "";
  if (!isMemberFileKey(key, who.memberId)) return status(400);
  const storage = documentStorage();
  if (!storage) return status(404);
  return status(await storeUploadBody(request, storage, key));
}
