import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { fileResponse, openDocumentFile } from "@/server/reprocann-files";
import { documentStorage } from "@/server/storage";

/** An admin opens one page of one of this member's documents (or its thumbnail, «?vista=miniatura»). */
export async function GET(request: Request, ctx: RouteContext<"/admin/socios/[id]/reprocann/[file]">) {
  const { user } = await requireAdmin();
  const storage = documentStorage();
  if (!storage) notFound();
  const { id, file } = await ctx.params;
  const preview = new URL(request.url).searchParams.get("vista") === "miniatura";
  const opened = await openDocumentFile(await getDb(), storage, file, { role: "admin", userId: user.id, memberId: id }, { preview });
  if (!opened) notFound();
  return fileResponse(opened);
}
