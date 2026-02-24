import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/api"
import { CalorieDonut } from "@/components/calorie-donut"
import { FoodLogItem } from "@/components/food-log-item"
import { FoodLogModal } from "@/components/food-log-modal"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Info,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export default function CaloriesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const data = useQuery(api.foodLogs.getTodaysLogs)
  const deleteLog = useMutation(api.foodLogs.deleteFoodLog)
  const updateLog = useMutation(api.foodLogs.updateFoodLog)

  const handleDelete = async (id: any) => {
    try {
      await deleteLog({ logId: id })
      toast.success("Log deleted")
    } catch (error) {
      toast.error("Failed to delete log")
    }
  }

  const handleVerify = async (id: any) => {
    try {
      await updateLog({ logId: id, isVerified: true })
      toast.success("Log verified")
    } catch (error) {
      toast.error("Failed to verify log")
    }
  }

  if (!data) {
    return (
      <div className="p-8 space-y-10 pb-32">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  const { logs, totals, targets, warnings } = data

  const groupedLogs = logs.reduce((acc: any, log: any) => {
    const type = log.mealType
    if (!acc[type]) acc[type] = []
    acc[type].push(log)
    return acc
  }, {})

  const mealTypes = ["breakfast", "lunch", "dinner", "snack"]
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen pb-40 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 p-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-3xl font-serif tracking-tight">Daily Intake</h1>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-1.5 border border-border/50">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background/50">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <CalendarIcon className="w-3 h-3" />
              {todayDate}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background/50">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-10">
        {/* Donut Chart */}
        <CalorieDonut 
          consumed={{
            calories: totals.calories,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat
          }}
          targets={{
            calories: targets.calories,
            protein: targets.protein,
            carbs: targets.carbs,
            fat: targets.fat
          }}
        />

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-4">
            {warnings.map((warning, idx) => (
              <Alert 
                key={idx} 
                variant={warning.type === "over" ? "destructive" : "default"}
                className={cn(
                  "border-none rounded-2xl shadow-sm",
                  warning.type === "over" && "bg-destructive/10 text-destructive",
                  warning.type === "under" && "bg-primary/10 text-primary",
                  warning.type === "info" && "bg-secondary text-muted-foreground"
                )}
              >
                {warning.type === "over" ? <XCircle className="h-4 w-4" /> : 
                 warning.type === "under" ? <AlertTriangle className="h-4 w-4" /> : 
                 <Info className="h-4 w-4" />}
                <AlertTitle className="text-[10px] font-bold uppercase tracking-widest mb-1 ml-2">
                  {warning.type === "over" ? "Target Warning" : 
                   warning.type === "under" ? "Intake Alert" : "Diet Insight"}
                </AlertTitle>
                <AlertDescription className="text-sm font-medium ml-2 opacity-90">
                  {warning.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Food Logs */}
        <div className="space-y-10">
          {mealTypes.map((type) => {
            const mealLogs = groupedLogs[type] || []
            const mealCalories = mealLogs.reduce((sum: number, log: any) => sum + log.totalCalories, 0)
            
            if (mealLogs.length === 0) return null

            return (
              <div key={type} className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-serif tracking-tight capitalize flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {type}
                  </h2>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    <span className="text-foreground">{Math.round(mealCalories)}</span> kcal
                  </div>
                </div>
                <div className="grid gap-5">
                  {mealLogs.map((log: any) => (
                    <FoodLogItem 
                      key={log._id} 
                      log={{
                        _id: log._id,
                        mealType: log.mealType as any,
                        timestamp: log.timestamp,
                        description: log.photoDescription || log.items[0]?.name || "Meal",
                        calories: log.totalCalories,
                        protein: log.totalProtein,
                        carbs: log.totalCarbs,
                        fat: log.totalFat,
                        ingredients: log.items.map((i: any) => ({
                          name: i.name,
                          amount: i.grams,
                          unit: "g",
                          calories: i.calories,
                          protein: i.protein,
                          carbs: i.carbs,
                          fat: i.fat
                        })),
                        photoUrl: log.photoUrl,
                        isVerified: log.isVerified,
                        source: log.entryType as any
                      }}
                      onDelete={handleDelete}
                      onVerify={handleVerify}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 opacity-40">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border border-border">
                <Plus className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="font-serif text-3xl tracking-tight">No meals logged</p>
                <p className="text-sm font-medium">Log your first meal to see your progress</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-28 right-8 z-20">
        <Button 
          size="icon" 
          className="h-16 w-16 rounded-full shadow-2xl shadow-primary/30 animate-in zoom-in duration-500 hover:scale-110 transition-transform"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>

      <FoodLogModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  )
}
