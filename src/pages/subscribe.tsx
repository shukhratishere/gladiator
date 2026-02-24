import { useAction } from "convex/react";
import { api } from "@convex/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Price {
  id: string;
  priceAmount: number;
  priceCurrency: string;
}

interface Product {
  id: string;
  name: string;
}

interface ProductWithPrices {
  product: Product;
  prices: Price[];
}

export default function SubscribePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const listProductsAction = useAction(api.pay.listProducts);
  const createCheckoutAction = useAction(api.pay.createCheckout);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await listProductsAction({});
        if (result.error) {
          throw new Error(result.error.message);
        }
        if (result.data) {
          setProducts(result.data as any);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        toast.error("Failed to load subscription plans");
      }
    };
    fetchProducts();
  }, [listProductsAction]);

  const handleSubscribe = async (priceId: string) => {
    setIsLoading(true);
    try {
      const result = await createCheckoutAction({ 
        priceId,
        successUrl: window.location.origin + "/success"
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      const purchaseUrl = (result.data as any)?.purchaseUrl;
      if (purchaseUrl) {
        window.location.href = purchaseUrl;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsLoading(false);
    }
  };

  // Find the $7.99/month product
  const proProduct = products.find(p => 
    p.product.name.toLowerCase().includes("pro") || 
    p.prices.some(pr => pr.priceAmount === 799)
  );
  
  const proPrice = proProduct?.prices[0];

  const features = [
    "AI-powered progressive overload coaching",
    "Personalized meal planning from your pantry",
    "Body composition tracking with Navy method",
    "Progress photo analysis with AI muscle detection",
    "Dynamic workout plans (3-6 day splits)",
    "Unlimited exercise alternatives",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in duration-1000">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-serif tracking-tight text-primary">
            Gladiator
          </h1>
          <h2 className="text-3xl md:text-4xl font-serif">Your Trial Has Ended</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
            Continue your fitness journey with Gladiator Pro. Get access to all premium features and reach your goals faster.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
          <div className="text-left space-y-6 order-2 md:order-1">
            <h3 className="text-xl font-serif mb-6">What's included in Pro:</h3>
            <ul className="space-y-4">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 opacity-80" />
                  <span className="text-muted-foreground font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="border border-primary/30 bg-card order-1 md:order-2 relative overflow-hidden rounded-[2.5rem] shadow-2xl shadow-primary/5">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-bl-2xl">
              Best Value
            </div>
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-3xl font-serif">Pro Subscription</CardTitle>
              <CardDescription className="text-sm font-medium">Full access to everything</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-6">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-6xl font-serif text-primary">$7.99</span>
                <span className="text-muted-foreground font-medium">/month</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                7-day free trial included for new members. Cancel anytime.
              </p>
            </CardContent>
            <CardFooter className="p-10 pt-0">
              <Button 
                className="w-full h-16 text-lg font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-full shadow-lg"
                onClick={() => proPrice && handleSubscribe(proPrice.id)}
                disabled={isLoading || !proPrice}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <footer className="pt-16 text-sm text-muted-foreground font-medium">
          <p>Questions? Contact <a href="mailto:support@gladiator.app" className="underline hover:text-primary transition-colors">support@gladiator.app</a></p>
        </footer>
      </div>
    </div>
  );
}
