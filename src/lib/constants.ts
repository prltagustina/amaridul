export const SITE_URL = "https://amaridul.com";

export const BRAND = {
  name: "Amarí Dul",
  tagline: "Asociación Civil",
  description: "Asociación civil",
};

/**
 * What a shared link shows (WhatsApp, social networks, search results) on every page: the slogan
 * and one image in the hero's design (plant photo, circular logo, slogan). A new image name makes
 * apps that cached the old preview fetch it again.
 */
export const SHARE_DESCRIPTION = "Construyendo comunidad para el acceso seguro.";
export const SHARE_IMAGE = {
  url: `${SITE_URL}/og/amaridul-hero.jpg`,
  width: 1200,
  height: 630,
  alt: `${BRAND.name} — ${SHARE_DESCRIPTION}`,
};

/** Confirmed contact channels. Empty means pending: hidden in production, flagged locally. */
export const CONTACT: { instagram: string; whatsapp: string; email: string } = {
  instagram: "",
  whatsapp: "",
  email: "",
};
