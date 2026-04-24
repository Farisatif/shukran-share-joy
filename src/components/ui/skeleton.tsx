import { cn } from "@/lib/utils";

type SkeletonVariant =
  | "default"
  | "text"
  | "title"
  | "circle"
  | "avatar"
  | "button"
  | "card"
  | "thumb";

type SkeletonProps = React.HTMLAttributes<HTMLElement> & {
  /** Render as <span> when used inline inside text/number elements. */
  as?: "div" | "span";
  /** Visual preset that matches a real piece of UI. */
  variant?: SkeletonVariant;
};

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  default: "rounded-md",
  text: "h-3 w-full rounded-full",
  title: "h-6 w-3/4 rounded-lg",
  circle: "rounded-full aspect-square",
  avatar: "h-11 w-11 rounded-2xl",
  button: "h-10 w-32 rounded-full",
  card: "h-40 w-full rounded-2xl",
  thumb: "aspect-video w-full rounded-xl",
};

/**
 * Modern skeleton placeholder with a soft shimmer sweep.
 * Uses theme-aware tokens via color-mix in styles.css (.skeleton).
 * Always preserve final layout dimensions to avoid jank on reveal.
 */
function Skeleton({
  className,
  as = "div",
  variant = "default",
  ...props
}: SkeletonProps) {
  const Tag = as as keyof React.JSX.IntrinsicElements;
  return (
    <Tag
      className={cn("skeleton", VARIANT_CLASSES[variant], className)}
      aria-hidden="true"
      {...(props as Record<string, unknown>)}
    />
  );
}

/** Three-dot bouncing pulse — drop-in replacement for spinner icons. */
function DotPulse({ className }: { className?: string }) {
  return (
    <span className={cn("dot-pulse", className)} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export { Skeleton, DotPulse };
