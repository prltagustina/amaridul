/** The official REPROCANN site (Ministerio de Salud de la Nación), checked 2026-11-03. */
export const REPROCANN_OFFICIAL_SITE = "https://reprocann.msal.gob.ar/home";

/**
 * Short video (28 s) on where to find the REPROCANN «código de vinculación», shared by the
 * association on 2026-11-03 (made by an outside professional). Public Google Drive link.
 */
export const LINK_CODE_VIDEO = "https://drive.google.com/file/d/1U4azAo7KtsCfFwD63zpsu0Ap5DHbBkyA/view";

/** Where the code is, as the video shows it. */
export const LINK_CODE_STEPS = [
  "Entrá a reprocann.msal.gob.ar con tu cuenta de Mi Argentina.",
  "Elegí el perfil «Paciente» y abrí tu «Registro de paciente».",
  "En «Identificación» está tu código de vinculación.",
] as const;
