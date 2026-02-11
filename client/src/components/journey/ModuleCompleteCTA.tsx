/**
 * Module Complete CTA Component
 * 
 * Displays after completing a module to encourage team collaboration
 */

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleCompleteCTAProps {
  moduleName: string; // "Brainstorm", "Choose", "Objectives"
}

export function ModuleCompleteCTA({ moduleName }: ModuleCompleteCTAProps) {
  const { user } = useAuth();

  // Don't show CTA if user is already authenticated
  if (user) {
    return null;
  }

  const getModuleMessage = () => {
    switch (moduleName.toLowerCase()) {
      case 'brainstorm':
      case 'direction':
        return 'Turn your brainstorm into actionable team objectives!';
      case 'choose':
      case 'decision':
        return 'Share your decision with your team and track progress!';
      case 'objectives':
      case 'alignment':
        return 'Manage these objectives collaboratively with your team!';
      default:
        return 'Share this with your team and collaborate!';
    }
  };

  return (
    <Card className="mt-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/50">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {moduleName} Module Complete!
          </h3>
          
          <p className="text-lg text-muted-foreground mb-6">
            {getModuleMessage()}
          </p>

          <div className="max-w-md mx-auto space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground mb-6">
              <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                <Users className="w-5 h-5 text-primary mb-1" />
                <span className="font-medium">2-10 Members</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary mb-1" />
                <span className="font-medium">Task Tracking</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                <Users className="w-5 h-5 text-primary mb-1" />
                <span className="font-medium">Team Sync</span>
              </div>
            </div>

            <Button 
              asChild 
              size="lg" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link href="/signup">
                Try Project Arrowhead Teams Free for 14 Days
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>

            <p className="text-sm text-muted-foreground">
              No credit card required • Cancel anytime
            </p>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Already have an account?
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
