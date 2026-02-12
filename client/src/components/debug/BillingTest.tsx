
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function BillingTest() {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<object | null>(null);
    const { toast } = useToast();

    const handleCheckout = async () => {
        setLoading('checkout');
        setResult(null);
        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            setResult(data);

            if (response.ok && data.url) {
                toast({
                    title: "Checkout Session Created",
                    description: "Redirecting to Stripe...",
                });
                // In a real app we'd redirect, but for debug we just show the URL
                console.log("Stripe Redirect URL:", data.url);
                window.open(data.url, '_blank');
            } else {
                toast({
                    variant: "destructive",
                    title: "Checkout Failed",
                    description: data.error || "Unknown error",
                });
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to initiate checkout",
            });
        } finally {
            setLoading(null);
        }
    };

    const handlePortal = async () => {
        setLoading('portal');
        setResult(null);
        try {
            const response = await fetch('/api/billing/portal', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            setResult(data);

            if (response.ok && data.portalUrl) {
                toast({
                    title: "Portal Session Created",
                    description: "Redirecting to Billing Portal...",
                });
                window.open(data.portalUrl, '_blank');
            } else {
                toast({
                    variant: "destructive",
                    title: "Portal Failed",
                    description: data.error || "Unknown error",
                });
            }
        } catch (error) {
            console.error('Portal error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load portal",
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto my-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Stripe Billing Debug
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleCheckout}
                        disabled={!!loading}
                        className="w-full"
                    >
                        {loading === 'checkout' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Test Checkout Flow
                    </Button>

                    <Button
                        onClick={handlePortal}
                        disabled={!!loading}
                        variant="outline"
                        className="w-full"
                    >
                        {loading === 'portal' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Test Customer Portal
                    </Button>
                </div>

                {result && (
                    <Alert className="mt-4 break-all">
                        <AlertTitle>API Response</AlertTitle>
                        <AlertDescription>
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
