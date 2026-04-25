import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Upload, LayoutDashboard, MessageSquare, Network, FileText, Shield, Image, Clock, Search, MapPin, FolderOpen, Sun, Moon, Bell, LogOut, Menu, X } from "lucide-react";
import gsap from "@/lib/gsap-utils";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { useShortcut } from "@/contexts/KeyboardShortcutsContext";
import { useNotifications } from "@/contexts/NotificationContext";

const navItems = [
  { to: "/upload", label: "Upload", icon: Upload },
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoPulseTweenRef = useRef<gsap.core.Tween | null>(null);
  const bootRanRef = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead, clearNotification, markAsRead } = useNotifications();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Kill infinite GSAP tween on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      logoPulseTweenRef.current?.kill();
    };
  }, []);

  // 1. Initial Boot Sequence (runs once on mount)
  useGSAP(() => {
    if (bootRanRef.current) return;
    bootRanRef.current = true;

    const tl = gsap.timeline();
    tl.fromTo(sidebarRef.current,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1, ease: "expo.out" }
    )
    .fromTo(".nav-link-item",
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
      "-=0.6"
    )
    .fromTo(".sidebar-footer",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.4"
    );

    tl.fromTo(mainContentRef.current,
      { scale: 0.98, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" },
      "-=0.2"
    );

    logoPulseTweenRef.current = gsap.to(".logo-shield", {
      filter: "drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.6))",
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);

  // 2. Navigation-specific animations
  useGSAP(() => {
    if (mainContentRef.current) {
      gsap.fromTo(mainContentRef.current,
        { opacity: 0.8, y: 5 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, { dependencies: [location.pathname] });

  // Register keyboard shortcuts
  useShortcut({ key: 'd', ctrlKey: true, action: () => navigate('/dashboard'), description: 'Go to Dashboard' });
  useShortcut({ key: 's', ctrlKey: true, action: () => navigate('/search'), description: 'Go to Search' });
  useShortcut({ key: 'm', ctrlKey: true, action: () => navigate('/geospatial'), description: 'Go to Maps' });
  useShortcut({ key: 'c', ctrlKey: true, action: () => navigate('/chat'), description: 'Go to AI Chat' });
  useShortcut({ key: 't', ctrlKey: true, action: () => toggleTheme(), description: 'Toggle Theme' });
  useShortcut({ key: '?', shiftKey: true, action: () => setShowShortcuts(true), description: 'Show Keyboard Shortcuts' });

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      navigate('/');
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-primary logo-shield" />
            <div>
              <h1 className="text-base font-bold font-mono text-primary cyber-text-glow tracking-wide">CHANAKYA</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Digital Forensics Platform</p>
            </div>
          </Link>
          {/* Mobile close button */}
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`nav-link-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group ${
                active
                  ? "bg-primary/10 text-primary cyber-border cyber-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform ${active ? "scale-110" : "group-hover:scale-110"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3 bg-sidebar/50 sidebar-footer">
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Notifications</DialogTitle></DialogHeader>
                <ScrollArea className="h-80"><div className="space-y-4 p-4">No new notifications</div></ScrollArea>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {user && (
          <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono">
                <p className="text-[10px] text-muted-foreground uppercase opacity-70">OFFICER ID</p>
                <p className="text-primary font-bold">{user.id}</p>
              </div>
              <Badge variant="outline" className="text-[9px] border-primary/20 text-primary uppercase">
                {user.role}
              </Badge>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full text-[10px] h-8 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-2" />
              LOGOUT
            </Button>
          </div>
        )}

        <div className="text-[9px] text-muted-foreground font-mono opacity-50 px-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
            SYSTEM ONLINE
          </div>
          <div>VER 1.0.0 — SECURE</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── DESKTOP Sidebar (always visible on md+) ── */}
      <aside
        ref={sidebarRef}
        className="hidden md:flex w-40 lg:w-64 shrink-0 bg-sidebar border-r border-border flex-col z-50"
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE Overlay + Drawer ── */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-sidebar border-r border-border flex flex-col z-50 transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Main Container ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/80 backdrop-blur-lg shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold font-mono text-primary tracking-widest">CHANAKYA</span>
          </Link>
          {user && (
            <div className="text-[10px] font-mono text-primary font-bold">{user.id}</div>
          )}
        </header>

        {/* Page content */}
        <main ref={mainContentRef} className="flex-1 overflow-auto relative bg-[#020617] opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,242,0.03),transparent_70%)] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}