import { useState, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/api"
import { toast } from "sonner"
import { 
  Camera, 
  Plus, 
  Trash2, 
  Loader2, 
  Upload, 
  Sparkles
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FoodLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export function FoodLogModal({ open, onOpenChange }: FoodLogModalProps) {
  const [activeTab, setActiveTab] = useState("photo")
  const [mealType, setMealType] = useState<MealType>("breakfast")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Photo Tab State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResults, setAiResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual Tab State
  const [ingredients, setIngredients] = useState([{ name: "", amount: "", unit: "g" }])

  // Quick Tab State
  const [quickLog, setQuickLog] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  })

  // Convex Actions/Mutations
  const generateUploadUrl = useMutation(api.foodLogs.generateMealPhotoUrl)
  const saveMealPhotoLog = useMutation(api.foodLogs.saveMealPhotoLog)
  const logFoodManual = useMutation(api.foodLogs.logFoodManual)
  const logFoodQuick = useMutation(api.foodLogs.logFoodQuick)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
      analyzePhoto(file)
    }
  }

  const analyzePhoto = async (file: File) => {
    setIsAnalyzing(true)
    try {
      const postUrl = await generateUploadUrl()
      await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      
      toast.info("AI analysis is being processed...")
    } catch (error) {
      toast.error("Failed to analyze photo")
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSavePhotoLog = async () => {
    if (!aiResults) return
    setIsSubmitting(true)
    try {
      await saveMealPhotoLog({
        storageId: aiResults.storageId,
        mealType,
        photoDescription: aiResults.description,
        items: aiResults.items,
        confidence: aiResults.confidence
      })
      toast.success("Meal logged successfully!")
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to save log")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualAdd = async () => {
    setIsSubmitting(true)
    try {
      await logFoodManual({
        mealType,
        items: ingredients.map(i => ({
          name: i.name,
          grams: parseFloat(i.amount) || 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }))
      })
      toast.success("Meal logged successfully!")
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to log meal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickAdd = async () => {
    setIsSubmitting(true)
    try {
      await logFoodQuick({
        mealType,
        name: quickLog.name,
        calories: parseFloat(quickLog.calories) || 0,
        protein: parseFloat(quickLog.protein) || 0,
        carbs: parseFloat(quickLog.carbs) || 0,
        fat: parseFloat(quickLog.fat) || 0
      })
      toast.success("Meal logged successfully!")
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to log meal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setPhotoPreview(null)
    setAiResults(null)
    setIngredients([{ name: "", amount: "", unit: "g" }])
    setQuickLog({ name: "", calories: "", protein: "", carbs: "", fat: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-3xl font-serif tracking-tight">Log Meal</DialogTitle>
          <div className="flex gap-2 mt-6 p-1 bg-secondary/30 rounded-full border border-border/50">
            {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => setMealType(type)}
                className={cn(
                  "flex-1 capitalize h-9 text-[10px] font-semibold tracking-widest rounded-full transition-all",
                  mealType === type ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                )}
              >
                {type}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-14 px-8 gap-6">
            <TabsTrigger value="photo" className="flex-1 data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full text-[10px] font-semibold uppercase tracking-widest transition-all">
              <Camera className="w-3.5 h-3.5 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full text-[10px] font-semibold uppercase tracking-widest transition-all">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex-1 data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full text-[10px] font-semibold uppercase tracking-widest transition-all">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Quick
            </TabsTrigger>
          </TabsList>

          <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
            {/* PHOTO TAB */}
            <TabsContent value="photo" className="mt-0 space-y-6">
              {!photoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/50 rounded-[2rem] aspect-square flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-serif text-xl">Upload or take a photo</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">AI will analyze calories & macros</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-border shadow-sm">
                    <img src={photoPreview} alt="Meal preview" className="w-full h-full object-cover" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="font-serif text-2xl text-foreground">Analyzing Meal...</p>
                      </div>
                    )}
                  </div>

                  {aiResults && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="bg-secondary/30 p-6 rounded-[1.5rem] border border-border/50">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-serif text-2xl leading-tight">{aiResults.description}</h3>
                          <div className="text-right">
                            <span className="text-4xl font-serif text-primary">{aiResults.totalCalories}</span>
                            <span className="text-[10px] ml-1 text-muted-foreground font-semibold uppercase tracking-widest">kcal</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-background/50 p-3 rounded-xl text-center border border-border/50">
                            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Protein</div>
                            <div className="font-serif text-xl">{aiResults.totalProtein}g</div>
                          </div>
                          <div className="bg-background/50 p-3 rounded-xl text-center border border-border/50">
                            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Carbs</div>
                            <div className="font-serif text-xl">{aiResults.totalCarbs}g</div>
                          </div>
                          <div className="bg-background/50 p-3 rounded-xl text-center border border-border/50">
                            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Fat</div>
                            <div className="font-serif text-xl">{aiResults.totalFat}g</div>
                          </div>
                        </div>
                      </div>
                      
                      <Button className="w-full h-14 font-semibold rounded-full shadow-lg" onClick={handleSavePhotoLog} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Log This Meal"}
                      </Button>
                      <Button variant="ghost" className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={resetForm}>
                        Retake Photo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* MANUAL TAB */}
            <TabsContent value="manual" className="mt-0 space-y-6">
              <div className="space-y-4">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-3 items-end">
                    <div className="flex-grow space-y-2">
                      {idx === 0 && <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Ingredient</Label>}
                      <Input 
                        placeholder="e.g. Chicken Breast" 
                        value={ing.name}
                        onChange={(e) => {
                          const newIng = [...ingredients]
                          newIng[idx].name = e.target.value
                          setIngredients(newIng)
                        }}
                        className="h-12 rounded-xl bg-secondary/30 border-border"
                      />
                    </div>
                    <div className="w-28 space-y-2">
                      {idx === 0 && <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Amount</Label>}
                      <div className="relative">
                        <Input 
                          placeholder="100" 
                          type="number"
                          value={ing.amount}
                          onChange={(e) => {
                            const newIng = [...ingredients]
                            newIng[idx].amount = e.target.value
                            setIngredients(newIng)
                          }}
                          className="h-12 pr-10 rounded-xl bg-secondary/30 border-border"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">g</span>
                      </div>
                    </div>
                    {ingredients.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 text-destructive hover:bg-destructive/5"
                        onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-border/50 h-12 text-[10px] font-semibold uppercase tracking-widest rounded-xl hover:bg-secondary/30"
                  onClick={() => setIngredients([...ingredients, { name: "", amount: "", unit: "g" }])}
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Add Ingredient
                </Button>
              </div>

              <Button 
                className="w-full h-14 font-semibold rounded-full shadow-lg mt-8" 
                onClick={handleManualAdd}
                disabled={isSubmitting || !ingredients[0].name}
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Log Meal"}
              </Button>
            </TabsContent>

            {/* QUICK TAB */}
            <TabsContent value="quick" className="mt-0 space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
                  <Input 
                    placeholder="e.g. Protein Shake" 
                    value={quickLog.name}
                    onChange={(e) => setQuickLog({ ...quickLog, name: e.target.value })}
                    className="h-12 rounded-xl bg-secondary/30 border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Calories (kcal)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={quickLog.calories}
                      onChange={(e) => setQuickLog({ ...quickLog, calories: e.target.value })}
                      className="h-12 rounded-xl bg-secondary/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Protein (g)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={quickLog.protein}
                      onChange={(e) => setQuickLog({ ...quickLog, protein: e.target.value })}
                      className="h-12 rounded-xl bg-secondary/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Carbs (g)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={quickLog.carbs}
                      onChange={(e) => setQuickLog({ ...quickLog, carbs: e.target.value })}
                      className="h-12 rounded-xl bg-secondary/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Fat (g)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={quickLog.fat}
                      onChange={(e) => setQuickLog({ ...quickLog, fat: e.target.value })}
                      className="h-12 rounded-xl bg-secondary/30 border-border"
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full h-14 font-semibold rounded-full shadow-lg mt-8" 
                onClick={handleQuickAdd}
                disabled={isSubmitting || !quickLog.name || !quickLog.calories}
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Quick Add"}
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
