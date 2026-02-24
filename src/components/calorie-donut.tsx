import { cn } from "@/lib/utils"
import { Flame, Beef, Wheat, Droplets } from "lucide-react"

interface CalorieDonutProps {
  consumed: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  targets: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export function CalorieDonut({ consumed, targets }: CalorieDonutProps) {
  const calPercentage = Math.min(100, (consumed.calories / targets.calories) * 100)
  const isOverTarget = consumed.calories > targets.calories
  const circumference = 2 * Math.PI * 80
  const strokeDashoffset = circumference - (calPercentage / 100) * circumference

  const macros = [
    {
      label: "Protein",
      icon: Beef,
      value: consumed.protein,
      target: targets.protein,
      color: "bg-primary",
      iconColor: "text-primary",
      unit: "g",
    },
    {
      label: "Carbs",
      icon: Wheat,
      value: consumed.carbs,
      target: targets.carbs,
      color: "bg-accent",
      iconColor: "text-accent",
      unit: "g",
    },
    {
      label: "Fat",
      icon: Droplets,
      value: consumed.fat,
      target: targets.fat,
      color: "bg-muted-foreground",
      iconColor: "text-muted-foreground",
      unit: "g",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-md mx-auto p-8 bg-card rounded-[2rem] border border-border shadow-sm">
      <div className="relative w-64 h-64">
        {/* Subtle glow effect when over target */}
        {isOverTarget && (
          <div className="absolute inset-0 rounded-full bg-destructive/5 blur-3xl animate-pulse" />
        )}
        
        <svg className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="80"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/5"
          />
          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r="80"
            fill="transparent"
            stroke={isOverTarget ? "var(--destructive)" : "var(--primary)"}
            strokeWidth="12"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset,
              transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease"
            }}
            strokeLinecap="round"
            className={cn(
              calPercentage >= 100 && !isOverTarget && "animate-pulse"
            )}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest mb-1">Consumed</span>
            <span className="text-6xl font-serif leading-none text-foreground">
              {Math.round(consumed.calories)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Flame className={cn("w-3.5 h-3.5", isOverTarget ? "text-destructive" : "text-primary")} />
            <span className="text-muted-foreground text-xs font-medium">
              of {targets.calories} kcal
            </span>
          </div>
          {isOverTarget && (
            <span className="text-destructive text-[10px] font-bold mt-4 tracking-widest uppercase">
              Over Target
            </span>
          )}
        </div>
      </div>

      {/* Macro bars */}
      <div className="grid grid-cols-1 gap-6 w-full px-2">
        {macros.map((macro) => {
          const percentage = Math.min(100, (macro.value / macro.target) * 100)
          const Icon = macro.icon
          return (
            <div key={macro.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl bg-secondary/50")}>
                    <Icon className={cn("w-4 h-4", macro.iconColor)} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{macro.label}</span>
                </div>
                <div className="text-xs font-medium">
                  <span className="text-foreground">{Math.round(macro.value)}</span>
                  <span className="text-muted-foreground"> / {macro.target}{macro.unit}</span>
                </div>
              </div>
              <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn("absolute top-0 left-0 h-full transition-all duration-1500 ease-out rounded-full", macro.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
