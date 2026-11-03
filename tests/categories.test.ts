// Member categories: "activo" is only for the Comisión Directiva and only the association assigns
// it; a Comisión member can also be a patient ("activo_paciente"), which is what dispensing will
// look at. The public admission can only ask for "adherente" or "paciente".
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { members, persons } from "@/server/db/schema";
import { admissionInput } from "@/server/admissions";
import { decisionInput } from "@/server/members";
import { institutionalInput } from "@/server/existing-members";
import { categoryLabel, membershipInput } from "@/server/member-profile";
import { isPatientCategory, requestableCategories } from "@/demo/content";
import { makeContext } from "./helpers/context";

describe("categorías de socio", () => {
  it("the association can set «Activo y paciente» wherever it assigns a category", () => {
    expect(membershipInput.parse({ category: "activo_paciente", since: "", status: "activo", minutesReference: "", room: "" }).category).toBe("activo_paciente");
    expect(decisionInput.safeParse({ decision: "aprobada", meetingDate: "2026-10-01", minutes: "Acta ficticia 1", category: "activo_paciente" }).success).toBe(true);
    expect(institutionalInput.safeParse({ numberMode: "next", category: "activo_paciente", since: "", status: "activo" }).success).toBe(true);
    expect(categoryLabel("activo_paciente")).toBe("Activo y paciente");
  });

  it("a person applying cannot ask to be «Activo»: only adherente or paciente", () => {
    const categoria = admissionInput.shape.categoria;
    expect(categoria.safeParse("activo").success).toBe(false);
    expect(categoria.safeParse("activo_paciente").success).toBe(false);
    expect(categoria.safeParse("paciente").success).toBe(true);
    expect(requestableCategories.map((c) => c.value)).toEqual(["adherente", "paciente"]);
  });

  it("patients are patients whatever else they are", () => {
    expect(["paciente", "activo_paciente"].every(isPatientCategory)).toBe(true);
    expect(["activo", "adherente", null, undefined].some(isPatientCategory)).toBe(false);
  });

  it("the register stores the combined category", async () => {
    const ctx = await makeContext();
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Ficticia Comisión", isFixture: true }).returning({ id: persons.id });
    const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy", category: "activo_paciente" }).returning({ id: members.id });
    const [row] = await ctx.db.select({ category: members.category }).from(members).where(eq(members.id, m.id));
    expect(row.category).toBe("activo_paciente");
  });
});
