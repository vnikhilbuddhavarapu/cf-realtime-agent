import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "default" | "subtle" | "success" | "warning";

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        variant === "default" && "border-zinc-800 bg-zinc-900 text-zinc-200",
        variant === "subtle" && "border-zinc-800 bg-transparent text-zinc-400",
        variant === "success" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
        variant === "warning" &&
          "border-amber-500/20 bg-amber-500/10 text-amber-200",
        className,
      )}
      {...props}
    />
  );
}
