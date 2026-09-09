"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printPage } from "@/lib/print";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={printPage} className="print:hidden">
      <Printer size={15} className="shrink-0" />
      {label}
    </Button>
  );
}
