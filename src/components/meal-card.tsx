import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Utensils } from "lucide-react"

interface MealItem {
  foodName: string
  grams: number
}

interface MealCardProps {
  index: number
  items: MealItem[]
}

export function MealCard({ index, items }: MealCardProps) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-secondary/30 px-4 py-2 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bebas leading-none">MEAL {index}</h3>
          <Utensils className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="p-4 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-sm font-medium">{item.foodName}</span>
              <Badge variant="outline" className="font-mono text-[10px] border-muted-foreground/30">
                {Math.round(item.grams)}g
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
