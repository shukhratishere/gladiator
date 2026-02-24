import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Coffee,
  Sun,
  Sunset,
  Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface Ingredient {
  name: string
  amount: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodLogEntry {
  _id: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  timestamp: number
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients?: Ingredient[]
  photoUrl?: string
  isVerified?: boolean
  source: "ai" | "manual" | "quick"
}

interface FoodLogItemProps {
  log: FoodLogEntry
  onEdit?: (log: FoodLogEntry) => void
  onDelete?: (id: string) => void
  onVerify?: (id: string) => void
}

const mealIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Sunset,
  snack: Moon,
}

const mealColors = {
  breakfast: "text-primary bg-primary/10",
  lunch: "text-accent bg-accent/10",
  dinner: "text-muted-foreground bg-secondary",
  snack: "text-muted-foreground bg-secondary",
}

export function FoodLogItem({ log, onEdit, onDelete, onVerify }: FoodLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = mealIcons[log.mealType]
  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-primary/30 shadow-sm hover-lift">
      <div className="p-5 flex items-center gap-5">
        {/* Meal Type Icon or Photo */}
        <div className="relative flex-shrink-0">
          {log.photoUrl ? (
            <img 
              src={log.photoUrl} 
              alt={log.description} 
              className="w-14 h-14 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", mealColors[log.mealType])}>
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              {time}
            </span>
            {log.source === "ai" && !log.isVerified && (
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-primary/30 text-primary bg-primary/5 rounded-full font-bold">
                <AlertCircle className="w-2.5 h-2.5 mr-1" />
                VERIFY
              </Badge>
            )}
            {log.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <h4 className="font-serif truncate text-xl leading-tight">
            {log.description}
          </h4>
          <div className="flex gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-tighter text-muted-foreground font-semibold">Protein</span>
              <span className="text-[11px] font-semibold">{Math.round(log.protein)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-tighter text-muted-foreground font-semibold">Carbs</span>
              <span className="text-[11px] font-semibold">{Math.round(log.carbs)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-tighter text-muted-foreground font-semibold">Fat</span>
              <span className="text-[11px] font-semibold">{Math.round(log.fat)}g</span>
            </div>
          </div>
        </div>

        {/* Calories & Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-2xl font-serif text-primary leading-none">
            {Math.round(log.calories)}
            <span className="text-[10px] ml-1 text-muted-foreground font-sans font-semibold uppercase tracking-widest">kcal</span>
          </div>
          
          <div className="flex items-center gap-1">
            {log.ingredients && log.ingredients.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-secondary"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {log.source === "ai" && !log.isVerified && onVerify && (
                  <DropdownMenuItem onClick={() => onVerify(log._id)}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                    Verify Log
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit?.(log)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={() => onDelete?.(log._id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Expanded Ingredients */}
      {isExpanded && log.ingredients && (
        <div className="px-6 pb-6 pt-0 space-y-4 border-t border-border/50 bg-secondary/20">
          <div className="pt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Breakdown</div>
          {log.ingredients.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground/90">{item.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.amount}{item.unit}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex gap-3 text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                  <span>P: {item.protein}g</span>
                  <span>C: {item.carbs}g</span>
                  <span>F: {item.fat}g</span>
                </div>
                <span className="font-serif text-lg text-primary/80 leading-none">{item.calories}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
