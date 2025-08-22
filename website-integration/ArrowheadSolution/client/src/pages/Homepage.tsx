import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Compass, Settings, ArrowRight } from "lucide-react";

export default function Homepage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-screen gradient-hero overflow-hidden">
        <div className="absolute inset-0 city-overlay"></div>
        
        {/* Animated dotted line */}
        <div className="absolute right-1/3 top-1/2 transform -translate-y-1/2 hidden lg:block">
          <svg width="200" height="100" viewBox="0 0 200 100" className="opacity-40">
            <path 
              d="M10 80 Q 100 20 190 60" 
              stroke="white" 
              strokeWidth="2" 
              strokeDasharray="5,5" 
              fill="none" 
              opacity="0.6"
            >
              <animate attributeName="stroke-dashoffset" values="0;-20" dur="3s" repeatCount="indefinite"/>
            </path>
            <circle cx="190" cy="60" r="3" fill="white" opacity="0.8"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-4">WE ARE HERE</p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Stop Running in Circles.<br />
              <span className="text-blue-200">Start Achieving Your Objectives.</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl leading-relaxed">
              Project Arrowhead is a thinking tool that helps managers and teams align on strategy, create clear plans, and execute with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/journey">
                  Use the Free Tool Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our proven HSE framework guides you through strategic planning with three essential components
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 bg-secondary">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Headlights</h3>
                <p className="text-muted-foreground">Illuminate your path forward with clear visibility into your objectives and strategic direction.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 bg-secondary">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Compass className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Steering Wheel</h3>
                <p className="text-muted-foreground">Navigate decisions with precision and maintain control over your strategic initiatives.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 bg-secondary">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Engine</h3>
                <p className="text-muted-foreground">Power your execution with systematic processes that drive consistent results.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Transform Your Business Strategy</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Powerful features designed to streamline your planning process and drive meaningful results
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Business strategy planning" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">Create Clear Objectives</h3>
                <p className="text-muted-foreground">Define and structure your business goals with precision, ensuring every team member understands the strategic direction.</p>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Professional team meeting" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">Run Better Meetings</h3>
                <p className="text-muted-foreground">Transform chaotic discussions into focused, productive sessions that drive decision-making and accountability.</p>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Team collaboration" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">Align Your Team</h3>
                <p className="text-muted-foreground">Create unity around shared objectives and ensure everyone is working toward the same strategic outcomes.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground">Real results from real professionals</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-secondary">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                    alt="Manager Mike" 
                    className="w-16 h-16 rounded-full object-cover mr-4" 
                  />
                  <div>
                    <h4 className="text-xl font-bold text-foreground">Manager Mike</h4>
                    <p className="text-muted-foreground">Operations Manager</p>
                  </div>
                </div>
                <p className="text-lg text-foreground italic">"This tool transformed our planning meetings from chaotic discussions into focused strategy sessions. We got a clear plan in under an hour."</p>
              </CardContent>
            </Card>
            
            <Card className="p-8 bg-secondary">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108755-2616b332c3c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                    alt="Founder Freya" 
                    className="w-16 h-16 rounded-full object-cover mr-4" 
                  />
                  <div>
                    <h4 className="text-xl font-bold text-foreground">Founder Freya</h4>
                    <p className="text-muted-foreground">Startup Founder</p>
                  </div>
                </div>
                <p className="text-lg text-foreground italic">"As a founder, making the right strategic choice is everything. Project Arrowhead gave me a structured way to think through my options and de-risk my decision."</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Strategy?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have streamlined their planning process with Project Arrowhead.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/journey">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
