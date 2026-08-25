import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
  ghost: "text-indigo-600 hover:text-indigo-700 hover:underline",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

/** Shared button styling for every portal page — replaces one-off `bg-indigo-600 ...` classNames. */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ variant = "primary", size = "md", className = "", ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${variant !== "ghost" ? SIZE_CLASSES[size] : ""} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
