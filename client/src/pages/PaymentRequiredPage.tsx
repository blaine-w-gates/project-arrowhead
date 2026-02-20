/**
 * Payment Required Page
 * 
 * Shown when user's trial has expired and they need to subscribe
 * to continue accessing Team MVP features
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function PaymentRequiredPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'Unable to start checkout. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="border-2 border-primary shadow-2xl">
          <CardHeader className="text-center pb-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Your Free Trial Has Ended</CardTitle>
            <p className="text-muted-foreground text-lg">
              Subscribe to continue using Project Arrowhead Teams
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Benefits Reminder */}
            <div>
              <h3 className="text-lg font-semibold mb-4">What You'll Get:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Shared team dashboard with unlimited projects</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Collaborative task management (Scoreboard)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>RRGT individual dashboards & Dial status</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Weekly touchbase check-ins for team alignment</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Support for 2-10 team members with role-based permissions</span>
                </li>
              </ul>
            </div>

            {/* Pricing */}
            <div className="bg-primary/5 p-6 rounded-lg text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-4xl font-bold text-primary">$49</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Cancel anytime • No long-term contracts
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecting to Checkout...
                  </>
                ) : (
                  <>
                    Subscribe Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                or{' '}
                <Link href="/ops/billing" className="text-primary hover:text-primary/80 font-medium">
                  view billing details
                </Link>
              </p>
            </div>

            {/* Free Tool Option */}
            <div className="pt-6 border-t">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Not ready to subscribe? You can still use our free tool:
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/journey">Use Free Journey Tool</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
