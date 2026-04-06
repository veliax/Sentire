import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, BarChart3, Shield, LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/statistics', label: 'Statistics', icon: BarChart3 },
  { path: '/admin', label: 'Admin', icon: Shield },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => { navigate(path); onNavigate?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function DashboardLayout() {
  const { logout } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 sticky top-0 z-20 shadow-lg shadow-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Toggle navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary" />
                  <span className="font-semibold text-foreground">Sentire</span>
                </div>
                <NavList onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-foreground text-lg font-semibold">Sentire System</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground">Admin User</span>
            <Avatar>
              <AvatarFallback className="bg-primary/20 text-primary border border-primary/30 text-sm">
                AU
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col w-64 bg-card/50 backdrop-blur border-r border-border min-h-[calc(100vh-65px)] p-4 shrink-0">
          <NavList />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
