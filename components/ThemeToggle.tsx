"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("tema", next ? "escuro" : "claro"); } catch {}
    setDark(next);
  };
  return (
    <button onClick={toggle} className="btn btn-ghost text-sm" aria-label="Alternar tema claro e escuro">
      {dark ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
