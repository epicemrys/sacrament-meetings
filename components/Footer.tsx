import type { ReactElement } from "react";
import { WARD_NAME } from "@/lib/ward";

export default function Footer(): ReactElement {
  return (
    <footer className="site-footer border-t border-line">
      <div className="page-shell flex flex-wrap justify-between gap-4 py-7 text-sm text-muted">
        <p><span className="font-semibold text-ink">{WARD_NAME}</span><br />Gather. Remember. Follow Him.</p>
        <p className="max-w-sm text-xs leading-6">Charles Ukoh - Course Project. Not an official Church website.</p>
      </div>
    </footer>
  );
}