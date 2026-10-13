import { isDemoEnabled } from "@/lib/demo";
import { Card, DevTag } from "@/components/ui/display";
import { BrandLockup } from "@/components/brand/headers";
import { EnvironmentNotice } from "../ui";
import LoginForm from "./login-form";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Visual preview of the second step, demo environment only. It does not skip any check:
  // without a pending password session the server action still rejects the code.
  const previewSecondFactor = isDemoEnabled() && (await searchParams).demo === "segundo-factor";
  return (
    <>
      <EnvironmentNotice />
      <main className="flex flex-1 items-start justify-center page-gutter pt-16 pb-16 sm:items-center sm:pt-10">
        <div className="w-full max-w-sm space-y-8">
          <header className="space-y-3 text-center">
            <span className="flex justify-center">
              <BrandLockup size="footer" tagline="Administración" alt="Amarí Dul" />
            </span>
            <h1 className="sr-only">Ingreso a la administración</h1>
          </header>
          <Card>
            <LoginForm initialStep={previewSecondFactor ? "second-factor" : "password"} />
          </Card>
          {previewSecondFactor && (
            <p className="text-center">
              <DevTag>Vista previa del segundo paso</DevTag>
            </p>
          )}
        </div>
      </main>
    </>
  );
}
