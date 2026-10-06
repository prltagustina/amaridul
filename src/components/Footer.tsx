import { BRAND } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-[#3f6043] py-6 sm:py-8 page-gutter text-center">
      <p className="text-sm sm:text-base text-background">
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}
