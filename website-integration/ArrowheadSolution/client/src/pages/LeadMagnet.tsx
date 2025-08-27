import { useState } from "react";
import { Helmet } from "react-helmet-async";
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
              Thank you for subscribing! Check your email for your free Endeavour Cycle course.
            </p>
            <p className="text-sm text-muted-foreground">
              You'll receive 7 value-packed emails over 14 days with frameworks to turn your ideas into action.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Free Course: A Strategic Framework for Managers | Project Arrowhead</title>
        <meta name="description" content="Stop running in circles. Get our free 7-module email course and learn the proven 'Endeavour Cycle' framework to turn your team's ideas into action." />
        <meta property="og:title" content="Free Course: A Strategic Framework for Managers | Project Arrowhead" />
        <meta property="og:description" content="Stop running in circles. Get our free 7-module email course and learn the proven 'Endeavour Cycle' framework to turn your team's ideas into action." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Free Course: A Strategic Framework for Managers | Project Arrowhead" />
        <meta name="twitter:description" content="Stop running in circles. Get our free 7-module email course and learn the proven 'Endeavour Cycle' framework to turn your team's ideas into action." />
      </Helmet>
      <div className="py-24 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">Stop Running in Circles.</h1>
        <p className="text-2xl text-blue-100 mb-8">A proven, step-by-step framework that turns your team's vague ideas into clear, actionable plans.</p>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-primary mr-3" />
              <h3 className="text-2xl font-bold text-foreground">Start the Free Course</h3>
            </div>
            
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>See your business with total clarity using the "7 Chess Pieces" framework</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Master the "Huddle & Play" rhythm to run focused, productive meetings</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Learn "Deliberate Practice" to rapidly and effectively improve your team's skills</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Use the "Cube Method" to turn overwhelming goals into simple, actionable plans</span>
              </li>
            </ul>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 italic">
                "Based on over 4,000 hours of consultation with 300+ managers and the seminal work of Dr. Thomas Buckholz."
              </p>
            </div>
            
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
            
            <p className="text-sm text-muted-foreground mt-4">100% free. 7 value-packed emails over 14 days. Unsubscribe anytime.</p>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
