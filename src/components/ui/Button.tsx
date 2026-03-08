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
        variant === "primary" && "bg-indigo-500 hover:bg-indigo-600 text-white",
        variant === "ghost" &&
          "bg-transparent hover:bg-[#252840] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2d3154]",
        variant === "danger" &&
          "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
