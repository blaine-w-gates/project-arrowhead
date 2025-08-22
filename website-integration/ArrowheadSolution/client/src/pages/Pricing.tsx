import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Find the Plan That's Right for You</h1>
          <p className="text-xl text-muted-foreground">Choose the perfect plan to accelerate your strategic planning</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Free Tier */}
          <Card className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold mb-2">Free</CardTitle>
              <div className="text-5xl font-bold text-foreground mb-2">$0</div>
              <p className="text-muted-foreground">Perfect for getting started</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Standalone To-Do List</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Assign Tasks & Set Due Dates</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Track Task Status</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Export to CSV/Markdown</span>
                </li>
              </ul>
              <Button asChild className="w-full" variant="outline">
                <Link href="/free-tool">Use Free Tool</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Pro Tier */}
          <Card className="relative border-primary shadow-lg">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
              Most Popular
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold mb-2">Pro</CardTitle>
              <div className="text-5xl font-bold text-foreground mb-2">$5</div>
              <p className="text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Everything in Free, plus:</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Save Unlimited Projects</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Access to Vision & Touch Base Modules</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Cloud Sync Across Devices</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/signup?tier=pro">Start Pro Trial</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Team Tier */}
          <Card className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold mb-2">Team</CardTitle>
              <div className="text-5xl font-bold text-foreground mb-2">$20</div>
              <p className="text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Everything in Pro, plus:</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Centralized Team Projects</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>User Roles & Permissions</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Collaborative Editing</span>
                </li>
              </ul>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/signup?tier=team">Start Team Trial</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h3>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">Can I upgrade later?</h4>
                <p className="text-muted-foreground">Yes, you can upgrade your plan at any time. Your billing will be prorated automatically.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">What is your cancellation policy?</h4>
                <p className="text-muted-foreground">You can cancel anytime. There are no long-term contracts or cancellation fees.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
