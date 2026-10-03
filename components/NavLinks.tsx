"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

interface NavLinksProps {
  links: readonly NavItem[];
  label: string;
}

export default function NavLinks({ links, label }: NavLinksProps): ReactElement {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="no-print">
      <ul className="flex flex-wrap gap-2">
        {links.map(({ href, label: text, exact = false }) => {
          const active = pathname === href || (!exact && href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-ink text-white" : "text-muted hover:bg-sage hover:text-ink"}`}>
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}