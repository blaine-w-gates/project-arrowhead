import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LeadMagnetForm from "@/components/LeadMagnetForm";

export default function LeadMagnet() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  if (isSubmitted) {
    return (
      <div className="py-24 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Welcome Aboard!</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Thank you for subscribing! Check your email for your free Business Basics course.
            </p>
            <p className="text-sm text-muted-foreground">
              You'll receive weekly insights on strategy and productivity, plus exclusive updates on new features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 gradient-hero">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">Go From Idea to Execution</h1>
        <p className="text-2xl text-blue-100 mb-8">Master the Fundamentals of Business</p>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-primary mr-3" />
              <h3 className="text-2xl font-bold text-foreground">Get Instant Access to Our Business Course</h3>
            </div>
            
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Get FREE lifetime access to our 'Business Basics' online course</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Receive weekly articles on strategy and productivity directly in your inbox</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Get exclusive updates on new features and company news</span>
              </li>
            </ul>
            
            <LeadMagnetForm
              className="space-y-4"
              onSuccess={() => {
                setIsSubmitted(true);
                toast({
                  title: "Success!",
                  description: "You've been subscribed to our newsletter.",
                });
              }}
            />
            
            <p className="text-sm text-muted-foreground mt-4">No spam, ever. Unsubscribe anytime.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
