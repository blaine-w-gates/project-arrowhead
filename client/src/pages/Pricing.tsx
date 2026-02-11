import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <div className="py-24 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start with our free tool, then scale with your team. No credit card required for trial.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Tool */}
          <Card className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold mb-2">Free Tool</CardTitle>
              <div className="text-5xl font-bold text-foreground mb-2">$0</div>
              <p className="text-muted-foreground">Always free, no credit card required</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Journey-guided strategic planning</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Brainstorm and objective setting</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Individual planning tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Export to PDF</span>
                </li>
              </ul>
              <Button asChild className="w-full" variant="outline" size="lg">
                <Link href="/journey">Try Free Tool</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Team Edition */}
          <Card className="relative border-2 border-primary shadow-2xl scale-105">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-1">
              Most Popular
            </Badge>
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold mb-2">Team Edition</CardTitle>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-bold text-primary">$49</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">For small teams (2-10 members)</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">Everything in Free, plus:</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Shared team dashboard</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Collaborative project management</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Task Scoreboard with assignments</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>RRGT individual dashboards</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Weekly touchbase check-ins</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>Role-based permissions (Owner, Manager, Member)</span>
                </li>
              </ul>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                <Link href="/signup">Start 14-Day Free Trial</Link>
              </Button>
              <p className="text-sm text-center text-muted-foreground mt-4">
                No credit card required • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h3>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">How does the 14-day free trial work?</h4>
                <p className="text-muted-foreground">
                  Sign up with your email and start using all Team Edition features immediately. No credit card required. 
                  After 14 days, you'll be prompted to subscribe to continue using team features.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">What happens after my trial ends?</h4>
                <p className="text-muted-foreground">
                  You'll receive reminders before your trial expires. After the trial, you can subscribe to continue with full access, 
                  or continue using the free tool. Your data is safely stored for 30 days if you decide to subscribe later.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">Can I cancel anytime?</h4>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees. 
                  Your access continues until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">How many team members can I have?</h4>
                <p className="text-muted-foreground">
                  The Team Edition supports 2-10 team members. You can invite team members with different roles 
                  (Owner, Manager, or Team Member) based on their responsibilities.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">Can I use the free tool forever?</h4>
                <p className="text-muted-foreground">
                  Absolutely! Our Journey tool for individual strategic planning remains free forever. 
                  Upgrade to Team Edition when you're ready to collaborate with your team.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
