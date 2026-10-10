import { EnvironmentNotice } from "../ui";
import LoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <>
      <EnvironmentNotice />
      <main className="flex-1 page-gutter pt-16 pb-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-medium text-[#3f6043]" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
            Administración
          </h1>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
