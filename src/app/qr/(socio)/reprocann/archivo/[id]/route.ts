import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { activeMemberOfRequest } from "@/server/member-request";
import { fileResponse, openDocumentFile } from "@/server/reprocann-files";
import { documentStorage } from "@/server/storage";

/** A member opens a file they sent. Any other document, or no member session: not found. */
export async function GET(_request: Request, ctx: RouteContext<"/qr/reprocann/archivo/[id]">) {
  const who = await activeMemberOfRequest();
  const storage = documentStorage();
  if (!who || !storage) notFound();
  const { id } = await ctx.params;
  const file = await openDocumentFile(await getDb(), storage, id, { role: "member", userId: who.userId, memberId: who.memberId });
  if (!file) notFound();
  return fileResponse(file);
}
