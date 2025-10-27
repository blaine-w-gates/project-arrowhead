/**
 * RRGT Tab (Tab 4 - My Work)
 * 
 * Displays "My Work" dashboard with RRGT columns and Dial
 * Features: 6-column RRGT, Dial comparison, Manager God-view
 */

import { useAuth } from '@/contexts/AuthContext';

export default function RRGTTab() {
  const { profile } = useAuth();

  const isManager = profile?.role === 'Account Owner' || profile?.role === 'Account Manager';

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Work (RRGT)</h1>
        <p className="text-muted-foreground mt-2">
          Track your tasks across 6 priority columns and use the Dial for focus
        </p>
      </div>

      <div className="bg-card border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">RRGT Dashboard Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          This tab will display your RRGT dashboard with 6 priority columns
          (Red, Red/Yellow, Yellow, Yellow/Green, Green, Top Priority) and the Dial
          for comparing and prioritizing items.
        </p>

        {isManager && (
          <p className="text-sm text-primary mb-6">
            ✨ As {profile.role}, you'll also have access to the Manager God-view
            to see team member RRGT data.
          </p>
        )}
        
        {profile && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Logged in as:</strong> {profile.name}</p>
            <p><strong>Role:</strong> {profile.role}</p>
          </div>
        )}
      </div>
    </div>
  );
}
