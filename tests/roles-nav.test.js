import { describe, expect, it } from "vitest";
import { navFor } from "@/config/roles";

describe("navigasi mahasiswa", () => {
  it("menghilangkan pencarian dan membuka proyek serta penghasilan langsung", () => {
    const menu = navFor("mahasiswa");

    expect(menu.some((item) => item.label === "Cari Proyek")).toBe(false);
    expect(menu.find((item) => item.label === "Proyek Saya")).toMatchObject({ href: "/projects" });
    expect(menu.find((item) => item.label === "Proyek Saya").children).toBeUndefined();
    expect(menu.find((item) => item.label === "Penghasilan")).toMatchObject({ href: "/earnings" });
    expect(menu.find((item) => item.label === "Penghasilan").children).toBeUndefined();
  });
});

describe("navigasi UMKM", () => {
  it("membuka halaman Pembayaran langsung dari sidebar", () => {
    const paymentItem = navFor("umkm").find((item) => item.label === "Pembayaran");

    expect(paymentItem).toMatchObject({ href: "/payments" });
    expect(paymentItem.children).toBeUndefined();
  });
});
