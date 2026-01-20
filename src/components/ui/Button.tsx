import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          "disabled:pointer-events-none disabled:opacity-60",
          size === "sm" && "h-9 px-3",
          size === "md" && "h-10 px-4",
          size === "lg" && "h-11 px-5 text-base",
          variant === "primary" &&
            "bg-zinc-50 text-zinc-950 hover:bg-zinc-200",
          variant === "secondary" &&
            "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-800",
          variant === "ghost" && "bg-transparent text-zinc-100 hover:bg-zinc-900",
          variant === "destructive" &&
            "bg-red-600 text-white hover:bg-red-500",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
