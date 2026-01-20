import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

type CardProps = ComponentPropsWithoutRef<"div">;

type CardHeaderProps = ComponentPropsWithoutRef<"div">;

type CardTitleProps = ComponentPropsWithoutRef<"h3">;

type CardDescriptionProps = ComponentPropsWithoutRef<"p">;

type CardContentProps = ComponentPropsWithoutRef<"div">;

type CardFooterProps = ComponentPropsWithoutRef<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("p-6 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("mt-1 text-sm text-zinc-400", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
