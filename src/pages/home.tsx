import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Play, 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  Calendar, 
  Clock, 
  Crown,
  Flame,
  AlertCircle,
  ChevronRight
} from "lucide-react"
import { useNavigate, Link } from "react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/api"
import { useEffect } from "react"
import { toast } from "sonner"
import { useUnits } from "@/hooks/use-units"
import { Badge } from "@/components/ui/badge"
import { TrialBanner } from "@/components/trial-banner"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const navigate = useNavigate()
  const { formatWeight } = useUnits()
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  const profile = useQuery(api.profiles.getProfile)
  const subscription = useQuery(api.profiles.checkSubscriptionStatus)
  const foodLogs = useQuery(api.foodLogs.getTodaysLogs)
  const activeSession = useQuery(api.workouts.getActiveSession)
  const personalizedPlan = useQuery(api.workoutAi.getPersonalizedPlan)
  const startSession = useMutation(api.workouts.startSession)

  useEffect(() => {
    if (profile === null) {
      navigate("/setup")
    }
  }, [profile, navigate])

  if (profile === undefined || subscription === undefined || foodLogs === undefined || activeSession === undefined || personalizedPlan === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Handle case where profile is null (redirecting anyway)
  if (profile === null || foodLogs === null) return null;

  const dayOfWeek = new Date().getDay() || 7 // 1-7, Mon-Sun
  const todayWorkout = personalizedPlan?.plan?.find(p => {
    return p.dayIndex === dayOfWeek
  }) || personalizedPlan?.plan?.[0]

  const handleStartSession = async () => {
    try {
      if (activeSession) {
        navigate("/workout")
        return
      }
      
      await startSession({ dayIndex: todayWorkout?.dayIndex || 1 })
      navigate("/workout")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start session")
    }
  }

  const { totals, targets, warnings } = foodLogs
  const calPercentage = Math.min(100, (totals.calories / targets.calories) * 100)
  const isOverTarget = totals.calories > targets.calories


  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      {subscription.status === "trial" && subscription.trialDaysLeft !== undefined && (
        <TrialBanner daysLeft={subscription.trialDaysLeft} />
      )}
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-primary leading-none font-serif tracking-tight">Gladiator</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.2em]">{todayDate}</p>
            {subscription.status === "trial" && (
              <Badge variant="secondary" className="text-[9px] h-4.5 bg-primary/10 text-primary border-none font-semibold px-2 rounded-full">
                TRIAL: {subscription.trialDaysLeft} DAYS LEFT
              </Badge>
            )}
            {subscription.status === "active" && (
              <Badge variant="secondary" className="text-[9px] h-4.5 bg-primary/10 text-primary border-none font-semibold flex items-center gap-1 px-2 rounded-full">
                <Crown className="h-2.5 w-2.5 fill-current" />
                PRO
              </Badge>
            )}
          </div>
        </div>
        <Avatar className="h-14 w-14 border border-border bg-secondary p-1">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.userId}`} />
          <AvatarFallback className="bg-secondary text-muted-foreground">JD</AvatarFallback>
        </Avatar>
      </header>

      {/* Today's Training */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Training
          </h2>
        </div>
        <Card className="bg-card border-border rounded-3xl overflow-hidden relative group hover-lift shadow-sm">
          <div className="absolute right-[-10%] top-[-10%] opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <TrendingUp className="w-48 h-48" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="mb-8">
              <h3 className="text-3xl font-serif leading-tight mb-3">
                {activeSession ? activeSession.dayName : todayWorkout?.formattedName.split(' - ').slice(0, 2).join(' - ')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {todayWorkout?.priorityExerciseCount && todayWorkout.priorityExerciseCount > 0 ? (
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-medium flex items-center gap-1 rounded-full px-2.5 py-0.5">
                    <Sparkles className="w-3 h-3" />
                    AI Adjusted
                  </Badge>
                ) : null}
                <Badge className="bg-secondary text-muted-foreground border-none text-[10px] font-medium flex items-center gap-1 rounded-full px-2.5 py-0.5">
                  <Clock className="w-3 h-3" />
                  ~60 min
                </Badge>
              </div>
            </div>
            <Button 
              onClick={handleStartSession}
              className="w-full bg-primary text-primary-foreground hover:opacity-90 font-semibold h-14 rounded-full shadow-md text-base"
            >
              {activeSession ? (
                <>
                  <Play className="w-5 h-5 fill-current mr-2" />
                  Continue Session
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current mr-2" />
                  Start Session
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Calorie Widget */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Nutrition
        </h2>
        <Link to="/calories">
          <Card className="bg-card border-border rounded-3xl hover:border-primary/30 transition-all group overflow-hidden hover-lift shadow-sm">
            <CardContent className="p-8 flex items-center gap-8">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/5"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="transparent"
                    stroke={isOverTarget ? "var(--destructive)" : "var(--primary)"}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 40}
                    style={{ 
                      strokeDashoffset: (2 * Math.PI * 40) - (calPercentage / 100) * (2 * Math.PI * 40) 
                    }}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">Left</span>
                  <span className={cn("text-lg font-semibold", isOverTarget ? "text-destructive" : "text-primary")}>
                    {Math.max(0, Math.round(targets.calories - totals.calories))}
                  </span>
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-serif">
                    {Math.round(totals.calories)}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">
                    / {targets.calories} kcal
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-4 text-[11px] font-medium text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-tighter opacity-60">Protein</span>
                      <span className="text-foreground">{Math.round(totals.protein)}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-tighter opacity-60">Carbs</span>
                      <span className="text-foreground">{Math.round(totals.carbs)}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-tighter opacity-60">Fat</span>
                      <span className="text-foreground">{Math.round(totals.fat)}g</span>
                    </div>
                  </div>
                  {warnings.length > 0 && (
                    <Badge variant="destructive" className="h-5 px-2 text-[9px] animate-pulse rounded-full">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Alert
                    </Badge>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mb-2">Current Weight</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-serif">{formatWeight(profile.currentWeightKg).split(' ')[0]}</span>
              <span className="text-xs text-muted-foreground font-medium">{formatWeight(profile.currentWeightKg).split(' ')[1]}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mb-2">Goal</p>
            <div className="flex items-end gap-2">
              <span className="text-xl font-serif capitalize">{profile.goal.replace(/_/g, ' ')}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
