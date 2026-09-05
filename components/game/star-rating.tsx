import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  value,
  max = 3,
  size = 20,
  className,
}: {
  value: number
  max?: number
  size?: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            "transition-transform",
            i < value ? "fill-accent text-accent drop-shadow-[0_0_6px_var(--color-accent)]" : "fill-transparent text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  )
}
