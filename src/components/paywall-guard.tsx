import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { Navigate } from "react-router";
import { Loader2 } from "lucide-react";

export function PaywallGuard({ children }: { children: React.ReactNode }) {
  const subscription = useQuery(api.profiles.checkSubscriptionStatus);

  if (subscription === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Payments not yet configured - allow all authenticated users access
  // Re-enable this once SURGENT_API_KEY is set up
  // if (!subscription.canAccess) {
  //   return <Navigate to="/subscribe" replace />;
  // }

  return <>{children}</>;
}
