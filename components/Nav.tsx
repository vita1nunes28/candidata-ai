"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Acompanhamento" },
  { href: "/perfil", label: "Perfil e CV" },
  { href: "/busca", label: "Buscar vagas" },
  { href: "/envios", label: "Envios" },
  { href: "/extensao", label: "Instalar extensão" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/como-funciona", label: "Como funciona" },
];
const HIDDEN = ["/login", "/teste-formulario"];

export function Nav() {
  const path = usePathname();
  if (HIDDEN.some((h) => path.startsWith(h))) return null;
  return (
    <nav className="md:w-60 md:min-h-screen md:border-r border-b md:border-b-0 px-4 py-4 md:py-8 flex md:flex-col gap-4" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center justify-between md:mb-6 shrink-0">
        <Link href="/" className="font-display text-xl font-bold" style={{ fontFamily: "Bricolage Grotesque" }}>Candidata.ai</Link>
        <span className="md:hidden"><ThemeToggle /></span>
      </div>
      <ul className="flex md:flex-col gap-1 overflow-x-auto text-[0.95rem]">
        {ITEMS.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 ${active ? "font-bold" : "muted"}`}
                style={active ? { background: "var(--surface)", border: "1px solid var(--line)" } : undefined}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden md:block mt-auto"><ThemeToggle /></div>
    </nav>
  );
}
