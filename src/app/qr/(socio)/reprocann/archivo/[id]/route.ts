import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { activeMemberOfRequest } from "@/server/member-request";
import { fileResponse, openDocumentFile } from "@/server/reprocann-files";
import { documentStorage } from "@/server/storage";

/** A member opens a file they sent (or its thumbnail, «?vista=miniatura»). Any other document, or no member session: not found. */
export async function GET(request: Request, ctx: RouteContext<"/qr/reprocann/archivo/[id]">) {
  const who = await activeMemberOfRequest();
  const storage = documentStorage();
  if (!who || !storage) notFound();
  const { id } = await ctx.params;
  const preview = new URL(request.url).searchParams.get("vista") === "miniatura";
  const file = await openDocumentFile(await getDb(), storage, id, { role: "member", userId: who.userId, memberId: who.memberId }, { preview });
  if (!file) notFound();
  return fileResponse(file);
}
