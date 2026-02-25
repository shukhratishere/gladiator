import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      await signIn("password", formData)
      toast.success("Welcome back!")
      window.location.href = "/"
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background animate-in fade-in duration-1000">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-6xl text-primary leading-none font-serif tracking-tight">Gladiator</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Dominate Your Training</p>
        </div>

        <Card className="bg-card border-border rounded-3xl shadow-xl">
          <CardContent className="p-10">
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input name="email" id="email" type="email" placeholder="name@example.com" className="h-14 bg-secondary/50 border-border rounded-2xl px-5" required />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <Label htmlFor="password" className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground">Password</Label>
                  <Link to="#" className="text-[10px] text-primary font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity">Forgot?</Link>
                </div>
                <Input name="password" id="password" type="password" className="h-14 bg-secondary/50 border-border rounded-2xl px-5" required />
              </div>
              <input type="hidden" name="flow" value="signIn" />
              <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg text-base">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-semibold hover:opacity-80 transition-opacity uppercase tracking-wider text-xs">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}
