/**
 * Dial Placeholder Component
 * 
 * Placeholder for the Dial component (future implementation)
 * Shows where the Dial will be positioned for item comparison
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DialPlaceholder() {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          The Dial (Coming Soon)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>The Dial</strong> will allow you to compare and prioritize two RRGT items side-by-side
            to determine which is more important. This helps you make decisions about task priority
            and placement in the RRGT columns.
          </AlertDescription>
        </Alert>

        <div className="mt-4 p-6 border-2 border-dashed border-purple-200 rounded-lg bg-white/50">
          <div className="text-center space-y-3">
            <div className="flex justify-center items-center gap-8">
              <div className="w-32 h-32 border-4 border-purple-300 rounded-lg bg-white flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Item A</span>
              </div>
              <div className="text-4xl font-bold text-purple-600">VS</div>
              <div className="w-32 h-32 border-4 border-blue-300 rounded-lg bg-white flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Item B</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Dial interface will appear here for item-by-item comparison
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
