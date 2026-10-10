// Prints fresh secrets for ONE environment. Generate separately for local, preview and production; never reuse.
import { randomBytes } from "node:crypto";

const b64 = () => randomBytes(32).toString("base64");

console.log(`BETTER_AUTH_SECRET=${b64()}
FIELD_KEYS=v1:${b64()}
FIELD_KEY_ACTIVE=v1
LOOKUP_KEYS=v1:${b64()}
LOOKUP_KEY_ACTIVE=v1`);
