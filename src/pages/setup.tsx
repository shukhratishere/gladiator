import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Check, ChevronRight, Target, Zap, Loader2, Ruler, Activity } from "lucide-react"
import { useNavigate } from "react-router"
import { useMutation, useAction } from "convex/react"
import { api } from "@convex/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Step 1: Basic Info
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric")
  const [sex, setSex] = useState<"male" | "female">("male")
  const [age, setAge] = useState("25")
  const [heightCm, setHeightCm] = useState("180")
  const [heightFeet, setHeightFeet] = useState("5")
  const [heightInches, setHeightInches] = useState("10")
  const [weight, setWeight] = useState("80")

  // Step 2: Body Measurements
  const [waist, setWaist] = useState("")
  const [neck, setNeck] = useState("")
  const [hips, setHips] = useState("")

  // Step 3: Goals & Training
  const [goal, setGoal] = useState<"cut" | "lean_bulk" | "maintain">("maintain")
  const [trainingDays, setTrainingDays] = useState([4])

  // Step 4: Confirmation Results
  const [results, setResults] = useState<{ 
    tdee: number; 
    protein: number; 
    carbs: number; 
    fat: number;
    bodyFat?: number;
  } | null>(null)

  const navigate = useNavigate()
  const createProfile = useMutation(api.profiles.createProfile)
  const seedAll = useAction(api.seed.seedAll)

  const handleCreateProfile = async () => {
    setIsSubmitting(true)
    try {
      const args: any = {
        unitSystem,
        sex,
        age: parseInt(age),
        goal,
        trainingDaysPerWeek: trainingDays[0],
        weight: parseFloat(weight),
        waist: waist ? parseFloat(waist) : undefined,
        neck: neck ? parseFloat(neck) : undefined,
        hips: hips ? parseFloat(hips) : undefined,
      }

      if (unitSystem === "metric") {
        args.heightCm = parseFloat(heightCm)
      } else {
        args.heightFeet = parseInt(heightFeet)
        args.heightInches = parseInt(heightInches)
      }

      const profile = await createProfile(args)

      setResults({
        tdee: profile.tdee,
        protein: profile.proteinTargetG,
        carbs: profile.carbsTargetG,
        fat: profile.fatTargetG,
        bodyFat: profile.estimatedBodyFatPercent,
      })
      setStep(4)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      await seedAll()
      toast.success("Welcome to Gladiator!")
      navigate("/")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed data")
      navigate("/")
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!age || (unitSystem === 'metric' ? !heightCm : (!heightFeet || !heightInches)) || !weight) {
        toast.error("Please fill in all basic info")
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      handleCreateProfile()
    }
  }

  const prevStep = () => setStep(s => Math.max(1, s - 1))

  const trainingSplits = {
    3: "Full Body (A/B/C)",
    4: "Upper/Lower Split",
    5: "Push/Pull/Legs + Upper/Lower",
    6: "Push/Pull/Legs x2",
  }

  return (
    <div className="min-h-screen flex flex-col p-8 max-w-md mx-auto animate-in fade-in duration-1000">
      <header className="mb-10">
        <h1 className="text-4xl text-primary leading-none mb-6 font-serif tracking-tight">Gladiator</h1>
        <div className="flex items-center justify-between gap-6">
          <Progress value={(step / 4) * 100} className="h-1 flex-1 bg-secondary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Step {step} of 4
          </span>
        </div>
      </header>

      <main className="flex-1">
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif leading-none">Basic Info</h2>
              <p className="text-muted-foreground text-sm font-medium">Let's start with the essentials.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Unit System</Label>
                <ToggleGroup type="single" value={unitSystem} onValueChange={(v) => v && setUnitSystem(v as any)} className="justify-start gap-2">
                  <ToggleGroupItem value="metric" className="flex-1 h-12 border-border font-medium uppercase text-[10px] tracking-wider rounded-2xl">Metric (kg/cm)</ToggleGroupItem>
                  <ToggleGroupItem value="imperial" className="flex-1 h-12 border-border font-medium uppercase text-[10px] tracking-wider rounded-2xl">Imperial (lbs/ft)</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Sex</Label>
                <ToggleGroup type="single" value={sex} onValueChange={(v) => v && setSex(v as any)} className="justify-start gap-2">
                  <ToggleGroupItem value="male" className="flex-1 h-12 border-border font-medium uppercase text-[10px] tracking-wider rounded-2xl">Male</ToggleGroupItem>
                  <ToggleGroupItem value="female" className="flex-1 h-12 border-border font-medium uppercase text-[10px] tracking-wider rounded-2xl">Female</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={80} className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Height</Label>
                {unitSystem === 'metric' ? (
                  <div className="flex items-center gap-3">
                    <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="cm" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                    <span className="font-medium text-muted-foreground">cm</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <Input type="number" value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} placeholder="ft" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                      <span className="font-medium text-muted-foreground">ft</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input type="number" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} placeholder="in" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                      <span className="font-medium text-muted-foreground">in</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif leading-none flex items-center gap-3">
                <Ruler className="w-8 h-8 text-primary" /> Body Measurements
              </h2>
              <p className="text-muted-foreground text-sm font-medium italic">Optional measurements for more accurate body fat estimation.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Waist Circumference ({unitSystem === 'metric' ? 'cm' : 'in'})</Label>
                <Input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Around navel" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Neck Circumference ({unitSystem === 'metric' ? 'cm' : 'in'})</Label>
                <Input type="number" value={neck} onChange={(e) => setNeck(e.target.value)} placeholder="Below Adam's apple" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
              </div>
              {sex === 'female' && (
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Hips ({unitSystem === 'metric' ? 'cm' : 'in'})</Label>
                  <Input type="number" value={hips} onChange={(e) => setHips(e.target.value)} placeholder="Widest part" className="h-14 text-lg font-semibold bg-secondary/50 rounded-2xl border-border" />
                </div>
              )}
            </div>

            <Button variant="ghost" onClick={() => setStep(3)} className="w-full text-muted-foreground hover:text-primary rounded-full h-14 font-medium">
              Skip for now
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif leading-none">Goals & Training</h2>
              <p className="text-muted-foreground text-sm font-medium">Define your path.</p>
            </div>

            <div className="space-y-6">
              <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Your Goal</Label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'cut', title: 'Cut', desc: 'Burn fat, keep muscle.', icon: Target },
                  { id: 'lean_bulk', title: 'Lean Bulk', desc: 'Build muscle, stay lean.', icon: Zap },
                  { id: 'maintain', title: 'Maintain', desc: 'Improve performance.', icon: Check },
                ].map((g) => (
                  <Card 
                    key={g.id} 
                    className={cn(
                      "cursor-pointer transition-all border-border rounded-3xl hover-lift",
                      goal === g.id ? "bg-primary/5 ring-2 ring-primary border-transparent" : "bg-card"
                    )}
                    onClick={() => setGoal(g.id as any)}
                  >
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("p-3 rounded-2xl", goal === g.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                        <g.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif text-2xl leading-none mb-1">{g.title}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{g.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-6 pt-6">
                <div className="flex justify-between items-end px-1">
                  <Label className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground">Training Days</Label>
                  <span className="text-3xl font-serif text-primary leading-none">{trainingDays[0]} Days</span>
                </div>
                <Slider 
                  value={trainingDays} 
                  onValueChange={setTrainingDays} 
                  min={3} 
                  max={6} 
                  step={1} 
                  className="py-4"
                />
                <div className="bg-secondary/30 p-4 rounded-2xl flex items-center gap-4 border border-border/50">
                  <Activity className="w-5 h-5 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-tight text-foreground">
                    {trainingSplits[trainingDays[0] as keyof typeof trainingSplits]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && results && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-serif leading-none">Your Plan is Ready</h2>
              <p className="text-muted-foreground text-sm font-medium">Optimized for your physique and goals.</p>
            </div>

            <Card className="bg-card border-border rounded-[2.5rem] shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-10 text-center bg-secondary/30 border-b border-border">
                  <p className="text-7xl font-serif leading-none mb-2 text-primary">{Math.round(results.tdee)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Daily Calories</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="p-6 text-center">
                    <p className="text-2xl font-serif leading-none mb-1">{Math.round(results.protein)}g</p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Protein</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-2xl font-serif leading-none mb-1">{Math.round(results.carbs)}g</p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Carbs</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-2xl font-serif leading-none mb-1">{Math.round(results.fat)}g</p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Fat</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-card border border-border p-6 rounded-3xl text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">TDEE</p>
                <p className="text-2xl font-serif">{Math.round(results.tdee)}</p>
              </div>
              <div className="bg-card border border-border p-6 rounded-3xl text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Est. Body Fat</p>
                <p className="text-2xl font-serif">{results.bodyFat ? `${results.bodyFat.toFixed(1)}%` : '--'}</p>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-3xl border border-dashed border-primary/20">
              <p className="text-[10px] text-center uppercase font-bold tracking-widest text-primary mb-3">Pro Tip</p>
              <p className="text-xs text-muted-foreground italic text-center leading-relaxed font-medium">
                "We'll adjust these targets automatically based on your weekly weight logs and progress photos."
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-10 flex gap-4">
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={prevStep} className="h-14 px-8 border-border font-semibold uppercase tracking-widest rounded-full">
            Back
          </Button>
        )}
        <Button 
          disabled={isSubmitting}
          onClick={step === 4 ? handleFinish : nextStep} 
          className="flex-1 h-14 bg-primary text-primary-foreground font-semibold text-lg rounded-full shadow-lg shadow-primary/10"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="flex items-center">
              {step === 4 ? "Start Your 7-Day Free Trial" : "Continue"}
              <ChevronRight className="w-5 h-5 ml-1" />
            </div>
          )}
        </Button>
      </footer>
    </div>
  )
}
