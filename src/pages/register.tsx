import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { useState, useEffect } from "react"

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  useEffect(() => {
    if (isAuthenticated && justRegistered) {
      navigate("/setup")
    }
  }, [isAuthenticated, justRegistered, navigate])

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      await signIn("password", formData)
      toast.success("Account created successfully!")
      setJustRegistered(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background animate-in fade-in duration-1000">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-6xl text-primary leading-none font-serif tracking-tight">Gladiator</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Enter the Arena</p>
        </div>

        <Card className="bg-card border-border rounded-3xl shadow-xl">
          <CardContent className="p-10">
            <form onSubmit={handleRegister} className="space-y-8">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input name="name" id="name" placeholder="John Doe" className="h-14 bg-secondary/50 border-border rounded-2xl px-5" required />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input name="email" id="email" type="email" placeholder="name@example.com" className="h-14 bg-secondary/50 border-border rounded-2xl px-5" required />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground ml-1">Password</Label>
                <Input name="password" id="password" type="password" className="h-14 bg-secondary/50 border-border rounded-2xl px-5" required />
              </div>
              <input type="hidden" name="flow" value="signUp" />
              <Button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg text-base">
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:opacity-80 transition-opacity uppercase tracking-wider text-xs">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
