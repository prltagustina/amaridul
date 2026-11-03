// The fee's payment data, as the association gave it: kept as text and checked, so a typo or a
// lost leading zero is caught before it reaches a member.
import { describe, expect, it } from "vitest";
import { FEE_PAYMENT, validCbuOrCvu, validCuit } from "@/lib/fee-payment";

describe("datos de pago de la cuota", () => {
  it("are exactly the association's, as text", () => {
    expect(FEE_PAYMENT).toEqual({
      holder: "Asociación Civil Amarí Dul",
      platform: "Mercado Pago",
      alias: "Amaridul.mp",
      cvu: "0000003100037002772495",
      cuit: "30-71843355-6",
      link: null,
    });
    expect(typeof FEE_PAYMENT.cvu).toBe("string");
    expect(FEE_PAYMENT.cvu).toHaveLength(22);
    expect(FEE_PAYMENT.cvu.startsWith("000000")).toBe(true);
  });

  it("have valid check digits", () => {
    expect(validCuit(FEE_PAYMENT.cuit)).toBe(true);
    expect(validCbuOrCvu(FEE_PAYMENT.cvu)).toBe(true);
    // One wrong digit is caught.
    expect(validCuit("30-71843355-7")).toBe(false);
    expect(validCbuOrCvu("0000003100037002772496")).toBe(false);
    expect(validCbuOrCvu("3100037002772495")).toBe(false);
  });
});
