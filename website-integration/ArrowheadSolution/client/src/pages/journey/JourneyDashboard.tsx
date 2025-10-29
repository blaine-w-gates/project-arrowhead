import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, ArrowRight, CheckSquare } from 'lucide-react';
import { JourneyUpgradeBanner } from '@/components/journey';

const JourneyDashboard: React.FC = () => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [, setLocation] = useLocation();

  const handleClearSession = () => {
    localStorage.clear();
    window.location.reload();
  };

  const startDirectionPath = () => {
    // Navigate to brainstorm step 1 to start the Direction path
    setLocation('/journey/brainstorm/step/1');
  };

  const startAlignmentPath = () => {
    // Navigate to objectives step 1 to start the Alignment path
    setLocation('/journey/objectives/step/1');
  };

  const startChoosePath = () => {
    // Navigate to choose step 1 to start the Choose path
    setLocation('/journey/choose/step/1');
  };

  return (
    <>
      <JourneyUpgradeBanner />
      <div className="container mx-auto mt-8 px-4 pt-24">
        <div className="max-w-6xl mx-auto">
        {/* Hero Section - exact clone of original */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-4">Project Arrowhead</h1>
          <p className="text-xl text-muted-foreground mb-6">
            17 crucial questions for more better task lists to use inside your project management software.
          </p>
          <div className="flex justify-center gap-2 mb-8">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              H - Headlights (Strategy)
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              S - Steering Wheel (Tactical)
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              E - Engine (Execution)
            </Badge>
          </div>
        </div>

        {/* Path Selection - reordered to match correct sequence */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Direction Path Card */}
          <Card 
            className="h-full shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={startDirectionPath}
          >
            <CardContent className="text-center p-8">
              <div className="mb-6">
                <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Direction</h3>
              <p className="text-muted-foreground mb-6">
                Explore the competitive landscape and generate a wide range of creative solutions. This module is for when you need to innovate and discover new possibilities.
              </p>
              <div className="text-sm text-muted-foreground mb-6">
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>Brainstorm</span>
                </div>
                <p className="mt-2">5 questions total</p>
              </div>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                Start Brainstorming
              </Button>
            </CardContent>
          </Card>

          {/* Decision Path Card */}
          <Card 
            className="h-full shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={startChoosePath}
          >
            <CardContent className="text-center p-8">
              <div className="mb-6">
                <CheckSquare className="w-16 h-16 text-blue-500 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Decision</h3>
              <p className="text-muted-foreground mb-6">
                Compare your options against clear, defined criteria. This structured process helps you make a confident, well-reasoned decision and gain team buy-in.
              </p>
              <div className="text-sm text-muted-foreground mb-6">
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>Choose</span>
                </div>
                <p className="mt-2">5 questions total</p>
              </div>
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Make Decisions
              </Button>
            </CardContent>
          </Card>

          {/* Alignment Path Card */}
          <Card 
            className="h-full shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={startAlignmentPath}
          >
            <CardContent className="text-center p-8">
              <div className="mb-6">
                <Target className="w-16 h-16 text-green-500 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Alignment</h3>
              <p className="text-muted-foreground mb-6">
                Transform your strategic decision into a concrete action plan. Define the steps, allocate resources, and establish clear accountability to ensure your objective is achieved.
              </p>
              <div className="text-sm text-muted-foreground mb-6">
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>Objectives</span>
                </div>
                <p className="mt-2">7 questions total</p>
              </div>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                Start Objectives
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Section - clone of original */}
        <div className="mt-12">
          <Card className="bg-secondary border-0">
            <CardContent className="p-6">
              <h5 className="text-lg font-semibold text-primary mb-4">
                <CheckSquare className="w-5 h-5 inline mr-2" />
                Quick Actions
              </h5>
              <div className="flex flex-wrap gap-4">
                <Button asChild variant="outline">
                  <Link href="/tasks">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    View All Tasks
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setShowClearConfirm(true)}>
                  Clear Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Clear Session Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clear Session Data</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all session data? This will remove all tasks, progress, and settings. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearSession}
              >
                Clear Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JourneyDashboard;
