/**
 * How the admin home greets each admin: by first name. The association asked that Luci be greeted
 * as «Jefa»; her account keeps its name, which is what the record of changes shows.
 */
export function adminGreeting(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0] ?? "";
  if (first.toLowerCase() === "luci") return "Jefa";
  return first || "equipo";
}
