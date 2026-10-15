import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { CLOSE_REASONS, formalAdmissionOf, getPreAdmission, latestInvitation } from "@/server/pre-admissions";
import { DetailList } from "@/components/ui/data-list";
import { Card } from "@/components/ui/display";
import { AdminPageHeader } from "../../../ui";
import { existingRequestOfPreAdmission } from "@/server/existing-members";
import PreAdmissionActions from "./actions-panel";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const noteFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export default async function PreadmisionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const pre = await getPreAdmission(db, getKeyrings().field, id);
  if (!pre) notFound();
  const [invitation, formal, existingRequest] = await Promise.all([latestInvitation(db, pre.id), formalAdmissionOf(db, pre.id), existingRequestOfPreAdmission(db, pre.id)]);

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/preadmisiones", label: "Preadmisiones" }} eyebrow={pre.reference} title={pre.fullName} description={`Recibida el ${dateFormat.format(pre.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="text-h3">Contacto</h2>
            <DetailList
              items={[
                { label: "Email", value: pre.email },
                ...(pre.phone ? [{ label: "Teléfono", value: pre.phone }] : []),
                { label: "Provincia", value: pre.province },
                { label: "Localidad", value: pre.locality },
              ]}
            />
          </Card>
          <Card className="space-y-5">
            <h2 className="text-h3">Intereses</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              {pre.interests.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <DetailList
              items={[
                { label: "REPROCANN", value: pre.reprocann ?? "—" },
                { label: "Participación", value: pre.wantsToParticipate ? "Sí" : "No" },
              ]}
            />
          </Card>
        </div>
        <PreAdmissionActions
          id={pre.id}
          reference={pre.reference}
          email={pre.email}
          formal={formal}
          status={pre.status}
          invitation={invitation && { sentAt: noteFormat.format(invitation.createdAt), expiresAt: noteFormat.format(invitation.expiresAt), expired: invitation.expiresAt <= new Date() }}
          closedReason={pre.closedReason}
          closeReasons={[...CLOSE_REASONS]}
          existingRequest={existingRequest && { id: existingRequest.id, reference: existingRequest.reference }}
          notes={pre.notes.map((n) => ({ id: n.id, text: n.body, at: noteFormat.format(n.createdAt), author: n.author }))}
        />
      </div>
    </>
  );
}
