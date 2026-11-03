import { describe, expect, it } from "vitest";
import { adminGreeting } from "@/lib/admin-greeting";

describe("saludo del inicio del panel", () => {
  it("greets Luci as «Jefa» and everyone else by first name", () => {
    expect(adminGreeting("Luci")).toBe("Jefa");
    expect(adminGreeting(" luci ")).toBe("Jefa");
    expect(adminGreeting("Agustina Peralta")).toBe("Agustina");
    expect(adminGreeting("Lucía Fernández")).toBe("Lucía");
    expect(adminGreeting("")).toBe("equipo");
    expect(adminGreeting(null)).toBe("equipo");
  });
});
