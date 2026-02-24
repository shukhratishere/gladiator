import { useState, useEffect } from "react";
import { Link } from "react-router";
import { X, Sparkles } from "lucide-react";

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("trial-banner-dismissed");
    if (!isDismissed && daysLeft <= 3) {
      setIsVisible(true);
    }
  }, [daysLeft]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("trial-banner-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-700">
      <div className="max-w-md mx-auto bg-card/80 backdrop-blur-xl border border-primary/20 text-foreground px-5 py-4 shadow-2xl rounded-[1.5rem] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded-full shrink-0">
            <Sparkles className="h-5 w-5 text-primary fill-primary/20" />
          </div>
          <p className="text-xs font-medium leading-relaxed">
            Your trial ends in <span className="text-primary font-bold">{daysLeft} days</span>. 
            <Link to="/subscribe" className="ml-1.5 text-primary font-bold underline underline-offset-4 hover:opacity-80 transition-opacity">
              Subscribe now
            </Link> to keep your progress.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground/50 hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
