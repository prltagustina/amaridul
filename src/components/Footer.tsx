import { BRAND } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="py-6 sm:py-8 page-gutter border-t border-border text-center">
      <p className="text-sm sm:text-base text-text-muted">
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}
