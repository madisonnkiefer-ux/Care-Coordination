"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { logPrint, type PrintResource } from "@/app/actions/print";

export function PrintButton({
  label = "Print",
  memberId,
  resource,
}: {
  label?: string;
  memberId: string;
  resource: PrintResource;
}) {
  const [isLogging, setIsLogging] = useState(false);

  async function handlePrint() {
    setIsLogging(true);
    try {
      await logPrint(memberId, resource);
    } catch (error) {
      console.error("Failed to record print audit event", error);
    } finally {
      setIsLogging(false);
      window.print();
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={isLogging}
      className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
