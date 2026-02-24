import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SuccessPage() {
  const updateStatus = useMutation(api.profiles.updateSubscriptionStatus);
  const navigate = useNavigate();

  useEffect(() => {
    const activateSubscription = async () => {
      try {
        await updateStatus({ status: "active" });
        toast.success("Subscription activated!");
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error("There was an issue activating your Pro features. Please contact support.");
      }
    };
    activateSubscription();
  }, [updateStatus]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <CheckCircle2 className="h-20 w-20 text-primary animate-in zoom-in duration-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Gladiator Pro!</h1>
          <p className="text-muted-foreground">
            Your subscription is now active. You have full access to all premium features.
          </p>
        </div>
        <Button 
          className="w-full h-12 text-lg font-bold" 
          onClick={() => navigate("/")}
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  );
}
