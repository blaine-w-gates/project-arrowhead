/**
 * Payment Required Page
 * 
 * Shown when user's trial has expired and they need to subscribe
 * to continue accessing Team MVP features
 */

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function PaymentRequiredPage() {
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
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                Subscribe Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                or{' '}
                <Link href="/pricing" className="text-primary hover:text-primary/80 font-medium">
                  view detailed pricing
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
