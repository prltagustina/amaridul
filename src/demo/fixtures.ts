// Visual fixtures only. Fictitious people (@example.com, DNI 99.xxx.xxx) and DEMO lots.
// Nothing here is real data; lot values must never be presented as real analyses.

import type { StaticImageData } from "next/image";
import lotPhoto from "@/assets/demo/lote-provisorio.jpg";

export type Cannabinoid = { compound: "CBD" | "CBDA" | "THC" | "THCA" | "CBG" | "CBN"; value: string };

export type Lot = {
  code: string;
  product: string;
  variety: string;
  chemotype: string;
  cultivated: string;
  harvested: string;
  analysed: string;
  lab: string;
  cannabinoids: Cannabinoid[];
  hasCertificate: boolean;
  status: "publicado" | "borrador" | "retirado";
  /** Provisional photo (cropped from the visual reference). */
  image?: StaticImageData;
  /** Approximate composition of the oil, mg/ml. Absent while the analysis is pending. */
  composition?: { thc: number; cbd: number; total: number; dropsPerMl: number };
};

export const lots: Lot[] = [
  {
    code: "AD-2025-08-01",
    product: "Producto DEMO A",
    variety: "Variedad DEMO",
    chemotype: "CBD dominante (1:2)",
    cultivated: "15/04/2025",
    harvested: "28/07/2025",
    analysed: "05/08/2025",
    lab: "Laboratorio DEMO",
    cannabinoids: [
      { compound: "CBD", value: "12,4 %" },
      { compound: "CBDA", value: "0,8 %" },
      { compound: "THC", value: "0,3 %" },
      { compound: "THCA", value: "0,2 %" },
      { compound: "CBG", value: "0,5 %" },
      { compound: "CBN", value: "< 0,1 %" },
    ],
    hasCertificate: true,
    status: "publicado",
    image: lotPhoto,
    composition: { thc: 6.5, cbd: 13.5, total: 20, dropsPerMl: 20 },
  },
  {
    code: "AD-2025-11-02",
    product: "Producto DEMO B",
    variety: "Variedad DEMO 2",
    chemotype: "Balanceado (1:1)",
    cultivated: "02/07/2025",
    harvested: "20/10/2025",
    analysed: "Pendiente",
    lab: "Laboratorio DEMO",
    cannabinoids: [
      { compound: "CBD", value: "—" },
      { compound: "THC", value: "—" },
    ],
    hasCertificate: false,
    status: "publicado",
  },
  {
    code: "AD-2024-12-07",
    product: "Producto DEMO A",
    variety: "Variedad DEMO",
    chemotype: "CBD dominante",
    cultivated: "10/08/2024",
    harvested: "25/11/2024",
    analysed: "07/12/2024",
    lab: "Laboratorio DEMO",
    cannabinoids: [{ compound: "CBD", value: "10,1 %" }],
    hasCertificate: true,
    status: "retirado",
    composition: { thc: 1, cbd: 19, total: 20, dropsPerMl: 20 },
  },
];

export const products = [
  { id: "demo-a", name: "Producto DEMO A", type: "Aceite", status: "activo" as const, lots: 2 },
  { id: "demo-b", name: "Producto DEMO B", type: "Flor seca", status: "activo" as const, lots: 1 },
  { id: "demo-c", name: "Producto DEMO C", type: "Crema tópica", status: "inactivo" as const, lots: 0 },
];

/** General codes: one code per lot, shared by every member. Never linked to a person. */
export const packageCodes = [
  { code: "AD-2025-08-01", lot: "AD-2025-08-01", status: "activo" as const, created: "06/08/2025" },
  { code: "AD-2025-11-02", lot: "AD-2025-11-02", status: "activo" as const, created: "21/10/2025" },
  { code: "AD-2024-12-07", lot: "AD-2024-12-07", status: "inactivo" as const, created: "08/12/2024" },
];

export function findLotByCode(code: string): Lot | undefined {
  const normalized = code.trim().toUpperCase();
  const pc = packageCodes.find((c) => c.code === normalized && c.status === "activo");
  return pc ? lots.find((l) => l.code === pc.lot) : undefined;
}

export type PreAdmissionStatus = "recibida" | "en-revision" | "invitada" | "cerrada" | "derivada";

export const preAdmissions = [
  {
    id: "pre-2026-0007",
    reference: "PRE-2026-0007",
    name: "Persona Ficticia 07",
    email: "persona.ficticia07@example.com",
    phone: "+54 9 000 000-0007",
    province: "Santa Fe",
    locality: "Localidad Ficticia",
    date: "09/10/2026",
    interests: ["Conocer el procedimiento para acceder a cannabis medicinal mediante la asociación"],
    reprocann: "En trámite",
    participation: "Sí",
    status: "recibida" as PreAdmissionStatus,
  },
  {
    id: "pre-2026-0006",
    reference: "PRE-2026-0006",
    name: "Persona Ficticia 06",
    email: "persona.ficticia06@example.com",
    phone: "+54 9 000 000-0006",
    province: "Córdoba",
    locality: "Localidad Ficticia",
    date: "08/10/2026",
    interests: ["Participar en actividades y proyectos comunitarios", "Conocer las alternativas para asociarme"],
    reprocann: "—",
    participation: "Sí",
    status: "recibida" as PreAdmissionStatus,
  },
  {
    id: "pre-2026-0005",
    reference: "PRE-2026-0005",
    name: "Persona Ficticia 05",
    email: "persona.ficticia05@example.com",
    phone: "+54 9 000 000-0005",
    province: "Santa Fe",
    locality: "Localidad Ficticia",
    date: "07/10/2026",
    interests: ["Acceder a orientación sobre cannabis medicinal"],
    reprocann: "No sé cómo gestionarlo",
    participation: "No",
    status: "en-revision" as PreAdmissionStatus,
  },
  {
    id: "pre-2026-0004",
    reference: "PRE-2026-0004",
    name: "Persona Ficticia 04",
    email: "persona.ficticia04@example.com",
    phone: "+54 9 000 000-0004",
    province: "Buenos Aires",
    locality: "Localidad Ficticia",
    date: "03/10/2026",
    interests: ["Colaborar profesionalmente con Amarí Dul"],
    reprocann: "—",
    participation: "Sí",
    status: "invitada" as PreAdmissionStatus,
  },
  {
    id: "pre-2026-0003",
    reference: "PRE-2026-0003",
    name: "Persona Ficticia 03",
    email: "persona.ficticia03@example.com",
    phone: "+54 9 000 000-0003",
    province: "Entre Ríos",
    locality: "Localidad Ficticia",
    date: "28/09/2026",
    interests: ["Conocer las alternativas para asociarme"],
    reprocann: "—",
    participation: "No",
    status: "cerrada" as PreAdmissionStatus,
  },
];

export type AdmissionStatus = "borrador" | "recibida" | "comision" | "aprobada" | "rechazada";

export const admissions = [
  {
    id: "adm-2026-0003",
    reference: "ADM-2026-0003",
    preReference: "PRE-2026-0004",
    name: "Persona Ficticia 04",
    category: "Adherente",
    progress: 4,
    date: "05/10/2026",
    status: "borrador" as AdmissionStatus,
  },
  {
    id: "adm-2026-0002",
    reference: "ADM-2026-0002",
    preReference: "PRE-2026-0002",
    name: "Persona Ficticia 02",
    category: "Paciente",
    progress: 9,
    date: "01/10/2026",
    status: "recibida" as AdmissionStatus,
  },
  {
    id: "adm-2026-0001",
    reference: "ADM-2026-0001",
    preReference: "PRE-2026-0001",
    name: "Persona Ficticia 01",
    category: "Activo",
    progress: 9,
    date: "24/09/2026",
    status: "comision" as AdmissionStatus,
  },
];

export type MemberStatus = "activo" | "suspendido" | "baja";

export const members = [
  {
    id: "ad-0004",
    number: "AD-0004",
    name: "Persona Ficticia 11",
    email: "persona.ficticia11@example.com",
    category: "Paciente",
    since: "12/09/2026",
    status: "activo" as MemberStatus,
    health: "REPROCANN pendiente",
    dispense: "No habilitada",
    web: "Cuenta activa",
  },
  {
    id: "ad-0003",
    number: "AD-0003",
    name: "Persona Ficticia 12",
    email: "persona.ficticia12@example.com",
    category: "Activo",
    since: "02/08/2026",
    status: "activo" as MemberStatus,
    health: "No corresponde",
    dispense: "No habilitada",
    web: "Activación pendiente",
  },
  {
    id: "ad-0002",
    number: "AD-0002",
    name: "Persona Ficticia 13",
    email: "persona.ficticia13@example.com",
    category: "Adherente",
    since: "15/07/2026",
    status: "suspendido" as MemberStatus,
    health: "No corresponde",
    dispense: "No habilitada",
    web: "Acceso suspendido",
  },
  {
    id: "ad-0001",
    number: "AD-0001",
    name: "Persona Ficticia 14",
    email: "persona.ficticia14@example.com",
    category: "Activo",
    since: "01/06/2026",
    status: "baja" as MemberStatus,
    health: "No corresponde",
    dispense: "No habilitada",
    web: "Sin acceso",
  },
];

/** Member seen in the portal demo. */
export const demoMember = {
  name: "Persona Ficticia 01",
  number: "AD-0004",
  category: "Paciente",
  since: "12/09/2026",
  status: "Activo",
  procedures: [
    { label: "Alta asociativa", status: "Completa", tone: "success" as const },
    { label: "Evaluación médica", status: "Pendiente", tone: "warning" as const },
    { label: "Vinculación REPROCANN", status: "Pendiente", tone: "warning" as const },
  ],
};

export const auditEntries = [
  { at: "10/10/2026 11:42", action: "Preadmisión revisada", entity: "PRE-2026-0005", actor: "admin.local@example.com" },
  { at: "10/10/2026 11:30", action: "Ingreso al panel", entity: "Sesión", actor: "admin.local@example.com" },
  { at: "09/10/2026 18:05", action: "Lote publicado", entity: "AD-2025-11-02", actor: "admin.local@example.com" },
  { at: "09/10/2026 17:58", action: "Código creado", entity: "AD-2025-11-02", actor: "admin.local@example.com" },
  { at: "08/10/2026 10:12", action: "Invitación enviada", entity: "PRE-2026-0004", actor: "admin.local@example.com" },
  { at: "05/10/2026 09:47", action: "Solicitud elevada a Comisión", entity: "ADM-2026-0001", actor: "admin.local@example.com" },
  { at: "01/10/2026 16:20", action: "Certificado cargado", entity: "AD-2025-08-01", actor: "admin.local@example.com" },
  { at: "28/09/2026 12:03", action: "Preadmisión cerrada", entity: "PRE-2026-0003", actor: "admin.local@example.com" },
];
