import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RefreshCcw, Scale, TrendingDown, Loader2, LineChart as ChartIcon } from "lucide-react"
import { MealCard } from "@/components/meal-card"
import { toast } from "sonner"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/api"
import { useState } from "react"
import { useUnits } from "@/hooks/use-units"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function NutritionPage() {
  const { weightUnit, measurementUnit, formatWeight } = useUnits()
  const targets = useQuery(api.nutrition.getTargets)
  const mealPlan = useQuery(api.nutrition.getTodaysMealPlan)
  const bodyCompTrend = useQuery(api.nutrition.getBodyCompositionTrend, { days: 30 })
  const logWeight = useMutation(api.nutrition.logWeight)
  const generateMealPlan = useMutation(api.mealPlan.generateMealPlan)

  const [weight, setWeight] = useState("")
  const [waist, setWaist] = useState("")
  const [isLogging, setIsLogging] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleLogWeight = async () => {
    if (!weight) return
    setIsLogging(true)
    try {
      await logWeight({ 
        weight: parseFloat(weight),
        waist: waist ? parseFloat(waist) : undefined 
      })
      toast.success("Weight and measurements logged")
      setWeight("")
      setWaist("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log weight")
    } finally {
      setIsLogging(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      await generateMealPlan({})
      toast.success("Meal plan regenerated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate meal plan")
    } finally {
      setIsRegenerating(false)
    }
  }

  if (targets === undefined || mealPlan === undefined || bodyCompTrend === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (targets === null) return null;

  const actualKcal = mealPlan?.kcalActual ?? 0
  const actualProtein = mealPlan?.proteinActualG ?? 0
  const actualCarbs = mealPlan?.carbsActualG ?? 0
  const actualFat = mealPlan?.fatActualG ?? 0

  const chartConfig = {
    weight: {
      label: `Weight (${weightUnit})`,
      color: "var(--primary)",
    },
    bodyFatPercent: {
      label: "Body Fat %",
      color: "#3b82f6",
    },
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bebas leading-none tracking-tight">NUTRITION</h1>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Current Weight</p>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xl font-bebas">{formatWeight(targets.currentWeightKg)}</span>
            {bodyCompTrend?.weightTrend && (
              <div className="flex items-center gap-1">
                <TrendingDown className={`w-4 h-4 ${bodyCompTrend.weightTrend.changeWeight <= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-xs font-bold">{Math.abs(bodyCompTrend.weightTrend.changeWeight)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Macro Summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-4xl font-bebas leading-none text-primary">{Math.round(actualKcal)}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Calories Consumed</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bebas leading-none text-muted-foreground">{Math.round(targets.kcalTarget)}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Target</p>
            </div>
          </div>
          <Progress value={(actualKcal / targets.kcalTarget) * 100} className="h-2" />
          
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Protein</span>
                <span>{Math.round(actualProtein)}g</span>
              </div>
              <Progress value={(actualProtein / targets.proteinTargetG) * 100} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Carbs</span>
                <span>{Math.round(actualCarbs)}g</span>
              </div>
              <Progress value={(actualCarbs / targets.carbsTargetG) * 100} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Fat</span>
                <span>{Math.round(actualFat)}g</span>
              </div>
              <Progress value={(actualFat / targets.fatTargetG) * 100} className="h-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body Composition Trend */}
      <Card className="bg-card border-border">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-primary" />
            Body Composition
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[200px] w-full">
            <ChartContainer config={chartConfig}>
              <LineChart data={bodyCompTrend?.dataPoints || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                />
                <YAxis yAxisId="left" orientation="left" domain={['auto', 'auto']} hide />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="var(--color-weight)" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Weight"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bodyFatPercent" 
                  stroke="var(--color-bodyFatPercent)" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Body Fat %"
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weight & Waist Input */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Weight ({weightUnit})</p>
              <Input 
                type="number" 
                placeholder="0.0" 
                className="h-9 font-bold" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Waist ({measurementUnit})</p>
              <Input 
                type="number" 
                placeholder="Optional" 
                className="h-9 font-bold" 
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </div>
          </div>
          <Button 
            disabled={isLogging || !weight}
            onClick={handleLogWeight}
            className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-widest h-10 shadow-lg shadow-primary/10"
          >
            {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Measurements"}
          </Button>
        </CardContent>
      </Card>

      {/* Meals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bebas tracking-wide">MEAL PLAN</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRegenerate} 
            disabled={isRegenerating}
            className="text-primary hover:text-primary/80 text-[10px] font-bold uppercase tracking-widest"
          >
            {isRegenerating ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCcw className="w-3 h-3 mr-1" />
            )}
            Regenerate
          </Button>
        </div>
        {mealPlan?.meals.map((meal) => (
          <MealCard key={meal.mealIndex} index={meal.mealIndex} items={meal.items} />
        ))}
        {!mealPlan && (
          <div className="text-center py-12 space-y-4 bg-card border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm italic">No meal plan for today.</p>
            <Button onClick={handleRegenerate} disabled={isRegenerating} className="font-bold uppercase tracking-widest">
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              Generate Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
