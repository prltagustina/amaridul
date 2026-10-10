import { requireAdmin } from "@/server/auth/session";
import { AdminShell } from "../ui";

// Every page below still calls requireAdmin() itself: the layout only provides the shell.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin({ allowWithoutSecondFactor: true });
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
