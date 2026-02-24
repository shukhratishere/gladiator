import { Outlet } from "react-router"
import { BottomNav } from "./bottom-nav"

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 pb-20">
      <main className="max-w-md mx-auto px-4 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
