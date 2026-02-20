import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

export default function BillingPage() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Parse query params for success/canceled
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("success") === "true") {
            toast({
                title: "Subscription Updated",
                description: "Thank you for your purchase! Your subscription is now active.",
                variant: "default",
            });
            refreshProfile(); // Refresh to get new status
            // Clear query params
            window.history.replaceState({}, "", "/ops/billing");
        } else if (params.get("canceled") === "true") {
            toast({
                title: "Order Canceled",
                description: "Your checkout session was canceled. No charges were made.",
                variant: "destructive",
            });
            window.history.replaceState({}, "", "/ops/billing");
        }
    }, [toast, refreshProfile]);

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) throw new Error("No auth token");

            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Failed to start checkout");

            // Redirect to Stripe
            window.location.href = data.url;
        } catch (error) {
            console.error("Checkout error:", error);
            toast({
                title: "Error",
                description: "Failed to start checkout process. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    const handlePortal = async () => {
        setIsLoading(true);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) throw new Error("No auth token");

            const response = await fetch("/api/billing/portal", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Failed to open portal");

            // Redirect to Stripe Portal
            window.location.href = data.portalUrl;
        } catch (error) {
            console.error("Portal error:", error);
            toast({
                title: "Error",
                description: "Failed to open billing portal. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isPro = profile?.subscriptionStatus === 'active';
    const isTrial = profile?.subscriptionStatus === 'trialing';
    const isPastDue = profile?.subscriptionStatus === 'past_due';

    // Explicitly import supabase for the token fetch in handlers
    // (Or better, assume AuthContext provides a way to get it, or use the global client)
    // For now I'll import it at the top.

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your team's subscription and billing details.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Plan Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Current Plan
                            {isPro ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Pro Active</Badge>
                            ) : isTrial ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Trial Active</Badge>
                            ) : (
                                <Badge variant="outline">Free Tier</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Your current subscription level and status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="font-semibold text-lg">
                                {isPro ? "Professional Plan" : "Free Starter Plan"}
                            </div>
                        </div>

                        {isTrial && (
                            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900 flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
                                <div className="space-y-1">
                                    <p className="font-medium">Trial ends in {profile?.daysLeftInTrial} days</p>
                                    <p>Upgrade now to keep access to all Pro features.</p>
                                </div>
                            </div>
                        )}

                        {isPastDue && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-900 flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                                <div className="space-y-1">
                                    <p className="font-medium">Payment Past Due</p>
                                    <p>Please update your payment method to restore full access.</p>
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-muted-foreground">
                            {isPro
                                ? "You have full access to all Arrowhead features."
                                : "Upgrade to Pro to unlock unlimited projects, advanced analytics, and priority support."}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t px-6 py-4">
                        {(isPro || isTrial) ? (
                            <Button variant="outline" onClick={handlePortal} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Manage Billing
                            </Button>
                        ) : (
                            <div /> // Spacer
                        )}

                        {!isPro && (
                            <Button onClick={handleSubscribe} disabled={isLoading} className="bg-primary">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Upgrade to Pro
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Feature Comparison / Value Prop (Static for now) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Plan Features</CardTitle>
                        <CardDescription>What's included in your plan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>Unlimited Projects</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>Advanced Analytics</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>Team Collaboration</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>Priority Support</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
                <p>Need help with your billing? Contact support at support@projectarrowhead.com</p>
            </div>
        </div>
    );
}


