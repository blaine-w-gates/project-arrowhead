/**
 * Journey Step Component
 * 
 * Renders a single step in the objective journey
 * Displays instructions, question, and answer input
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface JourneyStepProps {
  stepNumber: number;
  title: string;
  instructions: string;
  question: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function JourneyStep({
  stepNumber,
  title,
  instructions,
  question,
  placeholder,
  value,
  onChange,
}: JourneyStepProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {instructions}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Question and Answer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">
            {question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor={`step-${stepNumber}-answer`} className="sr-only">
              Your Answer
            </Label>
            <Textarea
              id={`step-${stepNumber}-answer`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-[300px] text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Take your time to think through this step. Your answer will be saved automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
