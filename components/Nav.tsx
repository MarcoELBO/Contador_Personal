"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Baticueva" },
  { href: "/pagos", label: "Pagos" },
  { href: "/recomendaciones", label: "Recomendaciones" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-amber/10 text-amber ring-1 ring-amber/30"
                : "text-muted hover:text-fg"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
