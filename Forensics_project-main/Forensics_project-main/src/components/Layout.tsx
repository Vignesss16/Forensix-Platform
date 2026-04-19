import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Upload, LayoutDashboard, MessageSquare, Network, FileText, Shield, Image, Clock, Search, MapPin, FolderOpen, Sun, Moon, Keyboard, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { useKeyboardShortcuts, useShortcut } from "@/contexts/KeyboardShortcutsContext";
import { useNotifications } from "@/contexts/NotificationContext";

const navItems = [
  { to: "/", label: "Upload", icon: Upload },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/search", label: "Search", icon: Search },
  { to: "/geospatial", label: "Maps", icon: MapPin },
  { to: "/cases", label: "Cases", icon: FolderOpen },
  { to: "/chat", label: "AI Search", icon: MessageSquare },
  { to: "/graph", label: "Network", icon: Network },
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/images", label: "Media", icon: Image },
  { to: "/report", label: "Report", icon: FileText },
];

interface LayoutProps {
  children: ReactNode;
  user?: { role: string; id: string };
  onLogout?: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { registerShortcut } = useKeyboardShortcuts();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Register keyboard shortcuts
  useShortcut({
    key: 'd',
    ctrlKey: true,
    action: () => navigate('/dashboard'),
    description: 'Go to Dashboard'
  });

  useShortcut({
    key: 's',
    ctrlKey: true,
    action: () => navigate('/search'),
    description: 'Go to Search'
  });

  useShortcut({
    key: 'm',
    ctrlKey: true,
    action: () => navigate('/geospatial'),
    description: 'Go to Maps'
  });

  useShortcut({
    key: 'c',
    ctrlKey: true,
    action: () => navigate('/chat'),
    description: 'Go to AI Chat'
  });

  useShortcut({
    key: 't',
    ctrlKey: true,
    action: () => toggleTheme(),
    description: 'Toggle Theme'
  });

  useShortcut({
    key: '?',
    shiftKey: true,
    action: () => setShowShortcuts(true),
    description: 'Show Keyboard Shortcuts'
  });

  const shortcuts = [
    { keys: 'Ctrl+D', description: 'Go to Dashboard' },
    { keys: 'Ctrl+S', description: 'Go to Search' },
    { keys: 'Ctrl+M', description: 'Go to Maps' },
    { keys: 'Ctrl+C', description: 'Go to AI Chat' },
    { keys: 'Ctrl+T', description: 'Toggle Theme' },
    { keys: 'Shift+?', description: 'Show Keyboard Shortcuts' },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      navigate('/');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-sidebar border-r border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-base font-bold font-mono text-primary cyber-text-glow tracking-wide">FORENSIX</h1>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Digital Forensics Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle>Notifications</DialogTitle>
                      {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllAsRead}>
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg border ${
                              !notification.read
                                ? 'bg-primary/5 border-primary/20'
                                : 'bg-secondary/50 border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-medium">{notification.title}</h4>
                                  {!notification.read && (
                                    <div className="h-2 w-2 bg-primary rounded-full" />
                                  )}
                                </div>
                                {notification.message && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {notification.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {notification.timestamp.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearNotification(notification.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </Button>
                            </div>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="mt-2 h-6 text-xs"
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-sm">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-mono">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary cyber-border cyber-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          {/* User Info */}
          {user && (
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-mono">
                  <p className="text-muted-foreground">USER</p>
                  <p className="text-primary font-bold">{user.id}</p>
                </div>
                <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                  {user.role.toUpperCase()}
                </Badge>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <LogOut className="h-3 w-3 mr-2" />
                LOGOUT
              </Button>
            </div>
          )}

          {/* System Status */}
          <div className="text-[10px] text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
              SYSTEM ONLINE
            </div>
            <div>v1.0.0 — Secure Mode</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}