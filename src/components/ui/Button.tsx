import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-medium rounded transition-colors disabled:opacity-50",
        size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-2",
        variant === "primary" && "bg-primary hover:bg-primary-hover text-white",
        variant === "ghost" &&
          "bg-transparent hover:bg-surface-2 text-muted hover:text-text-primary border border-border",
        variant === "danger" &&
          "bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
