/** The official REPROCANN site (Ministerio de Salud de la Nación), checked 2026-11-03. */
export const REPROCANN_OFFICIAL_SITE = "https://reprocann.msal.gob.ar/home";

/**
 * The association's own short video (30 s, no sound, text on screen) on where to find the
 * REPROCANN «código de vinculación», ending with the Amarí Dul logo. Served by the site itself.
 */
export const LINK_CODE_VIDEO = { src: "/videos/codigo-de-vinculacion.mp4", poster: "/videos/codigo-de-vinculacion.jpg", width: 720, height: 1280 } as const;

/** Where the code is, as the video shows it. */
export const LINK_CODE_STEPS = [
  "Entrá a reprocann.msal.gob.ar con tu cuenta de Mi Argentina.",
  "Elegí el perfil «Paciente» y abrí tu «Registro de paciente».",
  "En «Identificación» está tu código de vinculación: copialo y enviáselo a la asociación.",
] as const;
