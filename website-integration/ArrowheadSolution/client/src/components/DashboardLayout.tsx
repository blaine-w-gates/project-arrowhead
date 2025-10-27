/**
 * Dashboard Layout Component
 * 
 * Provides the 4-tab navigation structure for the main app
 * Tabs: Projects, Objectives, Scoreboard, RRGT
 */

import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Target, 
  CheckSquare, 
  ListTodo,
  LogOut 
} from 'lucide-react';

interface Tab {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { name: 'Projects', path: '/dashboard/projects', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'Objectives', path: '/dashboard/objectives', icon: <Target className="w-4 h-4" /> },
  { name: 'Scoreboard', path: '/dashboard/scoreboard', icon: <CheckSquare className="w-4 h-4" /> },
  { name: 'RRGT', path: '/dashboard/rrgt', icon: <ListTodo className="w-4 h-4" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Team MVP</h1>
              {profile && (
                <span className="ml-4 text-sm text-muted-foreground">
                  {profile.name} · {profile.role}
                </span>
              )}
            </div>

            {/* Sign Out */}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const isActive = location === tab.path;
              return (
                <Link key={tab.path} href={tab.path}>
                  <a
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                      ${isActive
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted'
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.name}
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main>{children}</main>
    </div>
  );
}
