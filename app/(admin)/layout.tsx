import type { ReactElement, ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="page-shell py-8 sm:py-10">
      <p className="eyebrow mb-8 border-b border-line pb-5">Leader tools</p>
      {children}
    </div>
  );
}