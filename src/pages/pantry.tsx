import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Search, Loader2, Sparkles, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PantryItem } from "@/components/pantry-item"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "@convex/api"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function PantryPage() {
  const pantry = useQuery(api.pantry.getPantry)
  const foodItems = useQuery(api.pantry.getFoodItems)
  const addToPantry = useMutation(api.pantry.addToPantry)
  const lookupFood = useAction(api.foodAi.lookupFood)
  const saveCustomFood = useMutation(api.customFoods.saveCustomFood)
  const addCustomFoodToPantry = useMutation(api.pantry.addCustomFoodToPantry)

  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [grams, setGrams] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isSearchingAi, setIsSearchingAi] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  // Filter standard and custom pantry items by search
  const filteredStandard = useMemo(() => {
    if (!pantry) return []
    return pantry.standard.filter(item => 
      item.food?.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [pantry, search])

  const filteredCustom = useMemo(() => {
    if (!pantry) return []
    return pantry.custom.filter(item => 
      item.food?.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [pantry, search])

  // Filter available food items for the dropdown/list
  const availableFoods = useMemo(() => {
    if (!foodItems) return []
    return foodItems.all.filter(food => 
      food.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [foodItems, search])

  const handleAiLookup = async () => {
    if (!search) return
    setIsSearchingAi(true)
    setAiResult(null)
    try {
      const result = await lookupFood({ foodName: search })
      setAiResult(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI lookup failed")
    } finally {
      setIsSearchingAi(false)
    }
  }

  const handleAddStandard = async (foodId: any) => {
    if (!grams) {
      toast.error("Please enter amount")
      return
    }
    setIsAdding(true)
    try {
      await addToPantry({
        foodItemId: foodId,
        gramsAvailable: parseFloat(grams)
      })
      toast.success("Added to pantry")
      setIsDialogOpen(false)
      setGrams("")
      setSearch("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to pantry")
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddAiFood = async () => {
    if (!aiResult || !grams) return
    setIsAdding(true)
    try {
      const customFoodId = await saveCustomFood({
        ...aiResult,
        source: "ai_lookup"
      })
      await addCustomFoodToPantry({
        customFoodId,
        gramsAvailable: parseFloat(grams)
      })
      toast.success(`${aiResult.name} added to pantry`)
      setAiResult(null)
      setGrams("")
      setSearch("")
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add food")
    } finally {
      setIsAdding(false)
    }
  }

  if (pantry === undefined || foodItems === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-1000">
      <header className="flex flex-col gap-6">
        <h1 className="text-3xl font-serif tracking-tight">Pantry</h1>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-12 bg-card border-border h-14 text-base font-medium rounded-2xl focus-visible:ring-primary shadow-sm" 
            placeholder="Search or add any food..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiLookup()}
          />
          {search && (
            <Button 
              size="sm" 
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold text-[10px] uppercase tracking-widest rounded-xl"
              onClick={handleAiLookup}
              disabled={isSearchingAi}
            >
              {isSearchingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              AI Lookup
            </Button>
          )}
        </div>
      </header>

      {aiResult && (
        <Card className="bg-primary/5 border-primary/20 border rounded-[2rem] animate-in zoom-in-95 duration-500 shadow-sm">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-serif leading-none mb-2">{aiResult.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={cn(
                    "text-[9px] font-semibold uppercase rounded-full px-2",
                    aiResult.confidence === 'high' ? "bg-success/10 text-success" :
                    aiResult.confidence === 'medium' ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {aiResult.confidence} Confidence
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Per 100g</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => setAiResult(null)}>
                <Plus className="w-5 h-5 rotate-45" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-background rounded-2xl border border-border/50">
                <p className="text-lg font-serif">{aiResult.caloriesPer100g}</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Kcal</p>
              </div>
              <div className="text-center p-3 bg-background rounded-2xl border border-border/50">
                <p className="text-lg font-serif">{aiResult.proteinPer100g}g</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Prot</p>
              </div>
              <div className="text-center p-3 bg-background rounded-2xl border border-border/50">
                <p className="text-lg font-serif">{aiResult.carbsPer100g}g</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Carb</p>
              </div>
              <div className="text-center p-3 bg-background rounded-2xl border border-border/50">
                <p className="text-lg font-serif">{aiResult.fatPer100g}g</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Fat</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Input 
                type="number" 
                placeholder="Grams in pantry" 
                className="h-12 bg-background rounded-xl border-border px-4" 
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
              <Button 
                disabled={isAdding || !grams}
                onClick={handleAddAiFood}
                className="bg-primary text-primary-foreground font-semibold rounded-full px-8 h-12"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-3 overflow-x-auto no-scrollbar mb-8">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border px-6 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all">All Items</TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border px-6 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all">Custom / AI</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8 m-0">
          {["lean_protein", "fattier_protein", "starchy_carb", "fat_source"].map(group => {
            const itemsInGroup = filteredStandard.filter(item => item.food?.group === group)
            if (itemsInGroup.length === 0) return null
            
            return (
              <div key={group} className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">
                  {group.replace('_', ' ')}
                </h3>
                <div className="space-y-3">
                  {itemsInGroup.map(item => (
                    <PantryItem 
                      key={item._id} 
                      id={item._id}
                      name={item.food?.name || ""} 
                      grams={item.gramsAvailable} 
                      proteinPer100={item.food?.proteinPer100g || 0}
                      type="standard"
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {filteredStandard.length === 0 && !search && (
             <div className="text-center py-16 bg-card border border-dashed border-border rounded-[2rem] opacity-60">
                <p className="text-muted-foreground text-sm font-medium italic">Your pantry is empty.</p>
             </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 m-0">
          {filteredCustom.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-[2rem] space-y-4 opacity-60">
              <Info className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground text-sm font-medium italic">
                No custom foods found.
              </p>
            </div>
          ) : (
            filteredCustom.map(item => (
              <PantryItem 
                key={item._id} 
                id={item._id}
                name={item.food?.name || ""} 
                grams={item.gramsAvailable} 
                proteinPer100={item.food?.proteinPer100g || 0}
                type="custom"
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Add Button for Standard Library */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-28 right-8 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 z-40 p-0 hover:scale-110 transition-transform">
            <Plus className="w-8 h-8" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border max-w-[90vw] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-serif">Add from Library</DialogTitle>
            <DialogDescription className="text-sm font-medium">Search the standard database of common fitness foods.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                className="pl-12 h-14 bg-secondary/30 border-border rounded-2xl" 
                placeholder="Search database..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {availableFoods.slice(0, 20).map(food => (
                <div 
                  key={food._id} 
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-transparent hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => handleAddStandard(food._id)}
                >
                  <div>
                    <p className="font-semibold text-sm">{food.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{food.group.replace('_', ' ')}</p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Amount to add (grams)</Label>
              <Input 
                type="number" 
                placeholder="e.g. 500" 
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="h-12 rounded-xl bg-secondary/30 border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <p className="text-[10px] text-muted-foreground text-center w-full italic font-medium">
              Can't find it? Use the AI Lookup on the main pantry page.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
