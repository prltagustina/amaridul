import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { fileResponse, openDocumentFile } from "@/server/reprocann-files";
import { documentStorage } from "@/server/storage";

/** An admin opens one page of one of this member's documents. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/socios/[id]/reprocann/[file]">) {
  const { user } = await requireAdmin();
  const storage = documentStorage();
  if (!storage) notFound();
  const { id, file } = await ctx.params;
  const opened = await openDocumentFile(await getDb(), storage, file, { role: "admin", userId: user.id, memberId: id });
  if (!opened) notFound();
  return fileResponse(opened);
}
