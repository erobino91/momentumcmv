"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
  prefix?: string;
}

export function CurrencyInput({
  value,
  onChange,
  decimals = 2,
  prefix,
  className,
  ...props
}: CurrencyInputProps) {
  const factor = Math.pow(10, decimals);
  const [cents, setCents] = useState(() => Math.round((value || 0) * factor));
  const skipSync = useRef(false);

  // sync external value changes (e.g. form reset)
  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return; }
    setCents(Math.round((value || 0) * factor));
  }, [value, factor]);

  function emit(c: number) {
    skipSync.current = true;
    setCents(c);
    onChange(c / factor);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      emit(cents * 10 + parseInt(e.key));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      emit(Math.floor(cents / 10));
    } else if (e.key === "Delete") {
      e.preventDefault();
      emit(0);
    }
    // allow Tab, Arrow keys, etc. to pass through
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    let c = 0;
    for (const d of digits) c = c * 10 + parseInt(d);
    emit(c);
  }

  const intPart = Math.floor(cents / factor);
  const decPart = cents % factor;
  const display =
    intPart.toLocaleString("pt-BR") +
    "," +
    decPart.toString().padStart(decimals, "0");

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-muted-foreground text-sm select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {}}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-right tabular-nums",
          prefix && "pl-8",
          className
        )}
        {...props}
      />
    </div>
  );
}
