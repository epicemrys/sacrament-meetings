"use client";

import type { ReactElement } from "react";

export default function PrintButton(): ReactElement {
  return <button type="button" onClick={() => window.print()} className="button-secondary no-print">Print programme <span aria-hidden="true">↗</span></button>;
}