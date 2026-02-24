import { Home, Dumbbell, Flame, Box, Camera } from "lucide-react"
import { Link, useLocation } from "react-router"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const location = useLocation()
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Dumbbell, label: "Train", path: "/workout" },
    { icon: Flame, label: "Eat", path: "/calories" },
    { icon: Box, label: "Pantry", path: "/pantry" },
    { icon: Camera, label: "Body", path: "/progress" },
  ]

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="bg-card/70 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-full px-4 py-2 flex justify-around items-center h-18">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <div className={cn(
                "p-2 rounded-full transition-all duration-300",
                isActive && "bg-primary/10 scale-110"
              )}>
                <item.icon className={cn("w-5 h-5", isActive && "fill-current/10")} />
              </div>
              <span className={cn(
                "text-[9px] font-semibold uppercase tracking-widest mt-1 transition-all duration-300",
                isActive ? "opacity-100" : "opacity-0 h-0"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
