import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@convex/api"
import { toast } from "sonner"
import { Id } from "@convex/dataModel"

interface PantryItemProps {
  id: Id<"pantryItems"> | Id<"customPantryItems">
  name: string
  grams: number
  proteinPer100: number
  type: "standard" | "custom"
}

export function PantryItem({ id, name, grams, proteinPer100, type }: PantryItemProps) {
  const updatePantryItem = useMutation(api.pantry.updatePantryItem)
  const removePantryItem = useMutation(api.pantry.removePantryItem)
  const updateCustomPantryItem = useMutation(api.pantry.updateCustomPantryItem)
  const removeCustomPantryItem = useMutation(api.pantry.removeCustomPantryItem)

  const handleAdjust = async (amount: number) => {
    const newGrams = Math.max(0, grams + amount)
    try {
      if (type === "custom") {
        await updateCustomPantryItem({
          customPantryItemId: id as Id<"customPantryItems">,
          gramsAvailable: newGrams
        })
      } else {
        await updatePantryItem({
          pantryItemId: id as Id<"pantryItems">,
          gramsAvailable: newGrams
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update item")
    }
  }

  const handleRemove = async () => {
    try {
      if (type === "custom") {
        await removeCustomPantryItem({ customPantryItemId: id as Id<"customPantryItems"> })
      } else {
        await removePantryItem({ pantryItemId: id as Id<"pantryItems"> })
      }
      toast.success(`${name} removed from pantry`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove item")
    }
  }

  return (
    <Card className="bg-card border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/30 shadow-sm hover-lift">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-serif text-lg leading-tight truncate mb-1.5">{name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-2 py-0.5 rounded-full">
              {grams}g available
            </span>
            <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-tighter">
              {proteinPer100}g P / 100g
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-border/50">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleAdjust(-100)}
              className="h-8 w-8 rounded-full hover:bg-background hover:text-primary transition-all"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleAdjust(100)}
              className="h-8 w-8 rounded-full hover:bg-background hover:text-primary transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRemove}
            className="h-9 w-9 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
