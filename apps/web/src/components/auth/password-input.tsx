"use client";

import { Input, type InputProps } from "@excelcabs/ui/components/input";
import { cn } from "@excelcabs/ui/lib/utils";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = Omit<InputProps, "type" | "icon">;

/** Password field with a show / hide toggle. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        icon={<LockKeyhole />}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-4"
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
