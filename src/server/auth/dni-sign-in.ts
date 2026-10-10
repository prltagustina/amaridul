// Member login: DNI + password. The DNI is resolved through person_identities (HMAC lookup)
// and never reaches Better Auth tables.
//
// This is the only module that relies on lightly documented Better Auth APIs:
//   - ctx.context.internalAdapter.{findAccounts, createSession, findUserById} (typed in @better-auth/core)
//   - setSessionCookie from "better-auth/cookies" (exported, not covered by the plugin guide)
// Pinned to better-auth 1.7.7; tests/auth-dni.test.ts guards upgrades.
import { and, eq, inArray } from "drizzle-orm";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { personIdentities, user } from "@/server/db/schema";
import { dniLookupCandidates, InvalidDniError } from "@/server/crypto/dni";
import type { Keyring } from "@/server/crypto/keyring";
import { clearFailures, isLocked, recordFailure } from "./lockout";
import { dummyHash } from "./password";

export const GENERIC_LOGIN_ERROR = "Los datos ingresados no son correctos.";

export function dniSignIn({ db, lookupRing }: { db: Database; lookupRing: Keyring }) {
  return {
    id: "dni-sign-in",
    endpoints: {
      signInDni: createAuthEndpoint(
        "/sign-in/dni",
        {
          method: "POST",
          body: z.object({ dni: z.string().min(1).max(32), password: z.string().min(1).max(256) }),
        },
        async (ctx) => {
          const fail = () => new APIError("UNAUTHORIZED", { message: GENERIC_LOGIN_ERROR });

          let candidates: ReturnType<typeof dniLookupCandidates> = [];
          try {
            candidates = dniLookupCandidates(lookupRing, ctx.body.dni);
          } catch (e) {
            if (!(e instanceof InvalidDniError)) throw e;
          }

          const identity = candidates.length
            ? (
                await db
                  .select({ personId: personIdentities.personId, lookup: personIdentities.dniLookup, version: personIdentities.dniLookupKeyVersion })
                  .from(personIdentities)
                  .where(inArray(personIdentities.dniLookup, candidates.map((c) => c.value)))
              )[0]
            : undefined;

          const [member] = identity
            ? await db
                .select({ id: user.id, status: user.status })
                .from(user)
                .where(and(eq(user.personId, identity.personId), eq(user.role, "MEMBER")))
            : [];

          const credential = member
            ? (await ctx.context.internalAdapter.findAccounts(member.id)).find((a) => a.providerId === "credential")
            : undefined;

          // Always verify against some Argon2id hash so response time does not reveal whether the DNI exists.
          const passwordOk = await ctx.context.password.verify({
            hash: credential?.password ?? (await dummyHash()),
            password: ctx.body.password,
          });

          if (!member || !credential?.password) throw fail();
          if (member.status !== "active" || (await isLocked(db, member.id))) throw fail();
          if (!passwordOk) {
            await recordFailure(db, member.id);
            throw fail();
          }
          await clearFailures(db, member.id);

          // Key rotation: move a lookup computed with an old key to the active one.
          const active = candidates[0];
          if (identity && identity.lookup !== active.value) {
            await db
              .update(personIdentities)
              .set({ dniLookup: active.value, dniLookupKeyVersion: active.version, updatedAt: new Date() })
              .where(eq(personIdentities.personId, identity.personId));
          }

          const session = await ctx.context.internalAdapter.createSession(member.id);
          if (!session) throw fail();
          const fullUser = await ctx.context.internalAdapter.findUserById(member.id);
          if (!fullUser) throw fail();
          await setSessionCookie(ctx, { session, user: fullUser });
          return ctx.json({ ok: true });
        },
      ),
    },
    rateLimit: [{ pathMatcher: (path) => path === "/sign-in/dni", window: 60, max: 5 }],
  } satisfies BetterAuthPlugin;
}
