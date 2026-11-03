import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// On a deployment, member documents go from the browser straight to the private Vercel Blob store.
// The installed @vercel/blob client (2.8.2) sends them to this API; nothing else is contacted. It is
// allowed only once REPROCANN_UPLOADS=on, so the policy stays 'self' until the private store is validated.
const blobUploads = process.env.REPROCANN_UPLOADS === "on" ? " https://vercel.com/api/blob/" : "";

// Static CSP without nonces: nonces would force dynamic rendering of the public static pages.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${blobUploads}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Private areas: never indexed, never cached, no Referer leaving the page.
const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // `next dev` prints every Server Function call with its arguments: DNI and passwords on sign-in.
  // Requests and errors are still logged; arguments are not.
  logging: { serverFunctions: false },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
