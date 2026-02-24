import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ArrowUp, ArrowRight, ArrowDown, Timer, CheckCircle2, Loader2, RefreshCw, Sparkles, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/api"

export default function WorkoutPage() {
  const navigate = useNavigate()
  const activeSession = useQuery(api.workouts.getActiveSession)
  const sessionDetails = useQuery(
    api.workouts.getSessionWithExercises,
    activeSession ? { sessionId: activeSession._id } : "skip"
  )
  
  const finishSession = useMutation(api.workouts.finishSession)
  const logSet = useMutation(api.workouts.logSet)
  const swapExercise = useMutation(api.workouts.swapExercise)
  
  const [seconds, setSeconds] = useState(0)
  const [isDeload, setIsDeload] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Alternatives Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [selectedExerciseForSwap, setSelectedExerciseForSwap] = useState<{ id: any, originalExerciseId: any, name: string } | null>(null)
  const alternatives = useQuery(
    api.workouts.getExerciseAlternatives,
    selectedExerciseForSwap ? { exerciseId: selectedExerciseForSwap.originalExerciseId } : "skip"
  )

  // Local state for set inputs
  const [setInputs, setSetInputs] = useState<Record<string, { weight: string; reps: string; rpe: string; pain: boolean; logged: boolean }>>({})

  useEffect(() => {
    if (activeSession) {
      const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
      setSeconds(elapsed > 0 ? elapsed : 0)
      setIsDeload(activeSession.isDeload)
    }
  }, [activeSession])

  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (sessionDetails) {
      const initialInputs: typeof setInputs = {}
      sessionDetails.exercises.forEach(ex => {
        for (let i = 1; i <= ex.setsCount; i++) {
          const key = `${ex._id}-${i}`
          const existingLog = ex.setLogs.find(l => l.setNumber === i)
          initialInputs[key] = {
            weight: existingLog?.weight.toString() ?? ex.recommendedWeight?.toString() ?? "",
            reps: existingLog?.reps.toString() ?? "",
            rpe: existingLog?.rpe?.toString() ?? "8",
            pain: existingLog?.painFlag ?? false,
            logged: !!existingLog
          }
        }
      })
      setSetInputs(prev => ({ ...initialInputs, ...prev }))
    }
  }, [sessionDetails])

  if (activeSession === undefined || (activeSession && sessionDetails === undefined)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (activeSession === null) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-6 p-8 text-center">
        <h2 className="text-3xl font-serif">No active session</h2>
        <p className="text-muted-foreground text-sm font-medium">Start a session from the dashboard to begin tracking.</p>
        <Button onClick={() => navigate("/")} className="font-semibold rounded-full h-12 px-8">
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLogSet = async (sessionExerciseId: any, setNumber: number) => {
    const key = `${sessionExerciseId}-${setNumber}`
    const input = setInputs[key]
    
    if (!input.weight || !input.reps) {
      toast.error("Please enter weight and reps")
      return
    }

    try {
      await logSet({
        sessionExerciseId,
        setNumber,
        weight: parseFloat(input.weight),
        reps: parseInt(input.reps),
        rpe: parseFloat(input.rpe),
        painFlag: input.pain
      })
      setSetInputs(prev => ({
        ...prev,
        [key]: { ...prev[key], logged: true }
      }))
      toast.success(`Set ${setNumber} logged`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log set")
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      await finishSession({ sessionId: activeSession._id })
      toast.success("Workout completed! Great work.")
      navigate("/")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finish session")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSwap = async (newExerciseId: any) => {
    if (!selectedExerciseForSwap) return
    try {
      await swapExercise({
        sessionExerciseId: selectedExerciseForSwap.id,
        newExerciseId
      })
      toast.success("Exercise swapped")
      setSwapModalOpen(false)
      setSelectedExerciseForSwap(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to swap exercise")
    }
  }

  return (
    <div className="space-y-8 pb-40 animate-in fade-in duration-1000">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif leading-none tracking-tight">{activeSession.dayName}</h1>
          <div className="flex items-center gap-2.5 bg-secondary/50 px-4 py-2 rounded-full border border-border">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm tracking-tight text-foreground">{formatTime(seconds)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <Label htmlFor="deload" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Deload</Label>
            <Switch id="deload" checked={isDeload} disabled className="scale-90" />
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider border-primary/20 text-primary rounded-full px-3">
            Hypertrophy Phase
          </Badge>
        </div>
      </header>

      <div className="space-y-6">
        {sessionDetails?.exercises.map((ex) => (
          <Card key={ex._id} className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-xl font-serif leading-none">{ex.exerciseName}</CardTitle>
                    {(ex as any).isPriority && (
                      <Badge className="bg-primary/10 text-primary border-none text-[8px] font-semibold h-4 rounded-full px-2">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> PRIORITY
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] uppercase font-semibold tracking-wider h-5 rounded-full bg-secondary/50">
                      {ex.exerciseType.replace('_', ' ')}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        setSelectedExerciseForSwap({ id: ex._id, originalExerciseId: ex.exerciseId, name: ex.exerciseName })
                        setSwapModalOpen(true)
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-widest mb-1.5">Target</p>
                  <p className="text-sm font-semibold leading-none">{ex.setsCount}×{ex.targetRepsMin}-{ex.targetRepsMax}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Recommendation</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{ex.recommendedWeight ?? '--'} kg</span>
                    {ex.action === 'increase' && <ArrowUp className="w-3.5 h-3.5 text-success" />}
                    {ex.action === 'hold' && <ArrowRight className="w-3.5 h-3.5 text-warning" />}
                    {ex.action === 'decrease' && <ArrowDown className="w-3.5 h-3.5 text-destructive" />}
                    {ex.action === 'micro_progress' && <ArrowUp className="w-3.5 h-3.5 text-accent opacity-70" />}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[...Array(ex.setsCount)].map((_, idx) => {
                  const setNum = idx + 1
                  const key = `${ex._id}-${setNum}`
                  const input = setInputs[key] || { weight: "", reps: "", rpe: "8", pain: false, logged: false }
                  
                  return (
                    <div key={setNum} className="grid grid-cols-[1fr_1fr_1.5fr_0.5fr] gap-3 items-center">
                      <Input 
                        type="number"
                        placeholder="kg" 
                        value={input.weight}
                        disabled={input.logged}
                        onChange={(e) => setSetInputs(prev => ({
                          ...prev,
                          [key]: { ...prev[key], weight: e.target.value }
                        }))}
                        className="h-11 text-center font-semibold bg-secondary/30 border-border rounded-xl"
                      />
                      <Input 
                        type="number"
                        placeholder="reps" 
                        value={input.reps}
                        disabled={input.logged}
                        onChange={(e) => setSetInputs(prev => ({
                          ...prev,
                          [key]: { ...prev[key], reps: e.target.value }
                        }))}
                        className="h-11 text-center font-semibold bg-secondary/30 border-border rounded-xl"
                      />
                      <Select 
                        value={input.rpe} 
                        disabled={input.logged}
                        onValueChange={(v) => setSetInputs(prev => ({
                          ...prev,
                          [key]: { ...prev[key], rpe: v }
                        }))}
                      >
                        <SelectTrigger className="h-11 text-xs font-semibold bg-secondary/30 border-border rounded-xl">
                          <SelectValue placeholder="RPE" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {[6, 7, 8, 8.5, 9, 9.5, 10].map(rpe => (
                            <SelectItem key={rpe} value={rpe.toString()} className="text-xs">RPE {rpe}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={input.logged}
                          onCheckedChange={() => !input.logged && handleLogSet(ex._id, setNum)}
                          className="w-6 h-6 border-2 border-border rounded-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all" 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alternatives Modal */}
      <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl">Swap Exercise</DialogTitle>
            <DialogDescription className="text-sm font-medium">
              Choose an alternative for <span className="text-foreground font-semibold">{selectedExerciseForSwap?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            {alternatives === undefined ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : alternatives.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">No alternatives found.</p>
              </div>
            ) : (
              alternatives.map((alt) => (
                <Card 
                  key={alt.alternativeExerciseId} 
                  className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all border-border bg-secondary/30 rounded-2xl overflow-hidden"
                  onClick={() => handleSwap(alt.alternativeExerciseId)}
                >
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold leading-tight mb-1">{alt.alternativeExercise?.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">{alt.reason}</p>
                    </div>
                    <RefreshCw className="w-4 h-4 text-primary" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSwapModalOpen(false)} className="w-full font-semibold rounded-full h-12">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-24 left-6 right-6 z-40">
        <Button 
          disabled={isSubmitting}
          onClick={handleFinish}
          className="w-full h-16 bg-primary text-primary-foreground font-semibold text-lg rounded-full shadow-2xl shadow-primary/20"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6 mr-3" />
              Finish Session
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
