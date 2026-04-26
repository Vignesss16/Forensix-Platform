import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate, Link } from "react-router-dom";
import {
  MessageSquare, Phone, Users, Image, AlertTriangle, Globe,
  Wallet, Shield, Search, Calendar, MapPin, Brain, FileText,
  BarChart3, TrendingUp, Clock, ChevronRight, ExternalLink,
} from "lucide-react";
import gsap from "@/lib/gsap-utils";
import { useGSAP } from "@gsap/react";
import StatCard from "@/components/StatCard";
import CaseManagement from "@/components/CaseManagement";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useRef, useEffect } from "react";

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Small custom icons for mini-map
function makeDotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

const DOT_RED = makeDotIcon("#ef4444");
const DOT_AMBER = makeDotIcon("#f59e0b");
const DOT_BLUE = makeDotIcon("#3b82f6");

function MapUpdater() {
  const map = useMap();
  useEffect(() => {
    // Wait for GSAP animations to complete, then force map to calculate exact container size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 1200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ─── Dashboard Mini Map ───────────────────────────────────────────────────────
function DashboardMiniMap() {
  const { data } = useInvestigation();

  const geoImages = useMemo(
    () => (data?.images ?? []).filter((img) => img.location),
    [data]
  );

  const clusters = useMemo(() => {
    const map: Record<string, typeof geoImages> = {};
    geoImages.forEach((img) => {
      const key = `${Math.round(img.location!.lat * 10) / 10}_${Math.round(img.location!.lng * 10) / 10}`;
      if (!map[key]) map[key] = [];
      map[key].push(img);
    });
    return map;
  }, [geoImages]);

  const center: [number, number] =
    geoImages.length > 0
      ? [geoImages[0].location!.lat, geoImages[0].location!.lng]
      : [20.5937, 78.9629]; // India default

  if (geoImages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No GPS data in this case</p>
          <p className="text-xs mt-0.5">Upload images with location metadata to see activity here</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={true}
      attributionControl={false}
    >
      <MapUpdater />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {geoImages.map((img, i) => {
        const key = `${Math.round(img.location!.lat * 10) / 10}_${Math.round(img.location!.lng * 10) / 10}`;
        const count = clusters[key]?.length ?? 1;
        const icon = count >= 3 ? DOT_RED : count >= 2 ? DOT_AMBER : DOT_BLUE;

        return (
          <Marker
            key={i}
            position={[img.location!.lat, img.location!.lng]}
            icon={icon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-medium">{img.filename}</p>
                {img.device && <p className="text-xs text-gray-500">{img.device}</p>}
                {img.timestamp && (
                  <p className="text-xs text-gray-400">
                    {new Date(img.timestamp).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {Object.entries(clusters).map(([key, imgs]) => {
        if (imgs.length < 2) return null;
        const count = imgs.length;
        const color = count >= 3 ? "#ef4444" : "#f59e0b";
        return (
          <Circle
            key={key}
            center={[imgs[0].location!.lat, imgs[0].location!.lng]}
            radius={count * 60000}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1, dashArray: "4 3" }}
          />
        );
      })}
    </MapContainer>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  to, icon: Icon, title, description, badge,
}: {
  to?: string; icon: any; title: string; description: string; badge?: string;
}) {
  const inner = (
    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer cyber-border group hover:border-primary/50 h-full feature-card opacity-0 relative overflow-hidden bg-gradient-to-br from-card to-card/50">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:animate-shimmer" />
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </span>
          {badge ? (
            <Badge variant="outline" className="text-[10px]">{badge}</Badge>
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : <div>{inner}</div>;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, suspiciousItems, foreignNumbers, cryptoWallets, isLoadingCaseData, activeCaseId } = useInvestigation();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || (!activeCaseId && !data)) return;
    const tl = gsap.timeline();
    
    // Smooth container entrance — fromTo so it never gets stuck at 0
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });

    // Hacker title reveal
    tl.fromTo(".dashboard-title", 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.3 }
    ).to(".dashboard-title", {
      duration: 1.2,
      text: "INVESTIGATION DASHBOARD",
      ease: "none"
    });

    // Staggered entrance for all cards
    tl.from(".stat-card", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: "power2.out"
    }, "-=0.8");

    tl.from(".alert-card", {
      scale: 0.95,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "back.out(1.7)"
    }, "-=0.4");

    tl.to(".feature-card", {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: "power1.out"
    }, "-=0.2");

    // Map and Flagged messages section entrance
    tl.from(".dashboard-grid-section", {
      scale: 0.98,
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.5");
    
    // Continuous subtle floating for alert card
    gsap.to(".alert-card", {
      y: -4,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: 2
    });

  }, { scope: containerRef, dependencies: [] }); // entrance runs ONCE only

  // Separate effect for "Counting up" the stats — only re-runs when data changes
  useGSAP(() => {
    if (!containerRef.current || (!activeCaseId && !data)) return;
    if (data) {
      gsap.utils.toArray(".stat-value").forEach((el: any) => {
        const endVal = parseInt(el.getAttribute("data-value") || "0");
        if (isNaN(endVal) || endVal === 0) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: endVal,
          duration: 1.5,
          ease: "power2.out",
          delay: 0.3, // let entrance animate finish first
          onUpdate: () => {
            el.textContent = Math.floor(obj.val).toLocaleString();
          }
        });
      });
    }
  }, { scope: containerRef, dependencies: [data, isLoadingCaseData] });

  // ── Derived values — memoized so they don't recompute on unrelated renders
  const highSeverity = useMemo(
    () => (suspiciousItems ? suspiciousItems.filter((i) => i.severity === "high").length : 0),
    [suspiciousItems]
  );
  const platforms = useMemo(
    () => (data ? [...new Set(data.chats.map((c) => c.platform).filter(Boolean))] : []),
    [data]
  );
  const geoCount = useMemo(
    () => (data ? data.images.filter((i) => i.location).length : 0),
    [data]
  );

  // If no active case AND no data is loaded, render the Intelligent Hub so the officer can select/create one
  if (!activeCaseId && !data) {
    return (
      <div className="animate-in fade-in duration-500">
        <CaseManagement />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 dashboard-container px-4 md:px-6 py-4 md:py-6" ref={containerRef}>
      {/* Header */}
      <div className="flex items-start md:items-center justify-between flex-wrap gap-2 sticky top-0 bg-background/80 backdrop-blur-md z-20 pb-4 pt-2">
        <div>
          <h1 className="text-xl md:text-2xl font-black font-mono tracking-[0.2em] text-primary cyber-text-glow uppercase dashboard-title">
            MISSION DASHBOARD
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/5 uppercase tracking-widest px-2 py-0">
              Operational Status: Active
            </Badge>
            <span className="hidden sm:inline text-[10px] text-muted-foreground/40 font-mono uppercase tracking-tighter">Secure Link Established</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {highSeverity > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {highSeverity} high
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-[10px] gap-1">
            <Shield className="h-3 w-3" />
            ACTIVE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card"><StatCard title="Total Chats" value={data?.chats.length ?? 0} icon={<MessageSquare className="h-5 w-5" />} loading={isLoadingCaseData} /></div>
        <div className="stat-card"><StatCard title="Call Logs" value={data?.calls.length ?? 0} icon={<Phone className="h-5 w-5" />} loading={isLoadingCaseData} /></div>
        <div className="stat-card"><StatCard title="Contacts" value={data?.contacts.length ?? 0} icon={<Users className="h-5 w-5" />} loading={isLoadingCaseData} /></div>
        <div className="stat-card"><StatCard title="Images" value={data?.images.length ?? 0} icon={<Image className="h-5 w-5" />} loading={isLoadingCaseData} /></div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="alert-card"><StatCard title="Suspicious Flags" value={suspiciousItems.length} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" loading={isLoadingCaseData} /></div>
        <div className="alert-card"><StatCard title="Foreign Numbers" value={foreignNumbers.length} icon={<Globe className="h-5 w-5" />} variant="warning" loading={isLoadingCaseData} /></div>
        <div className="alert-card"><StatCard title="Crypto Wallets" value={cryptoWallets.length} icon={<Wallet className="h-5 w-5" />} variant="accent" loading={isLoadingCaseData} /></div>
      </div>

      {/* Map + Suspicious Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 dashboard-grid-section">

        {/* ── Case Activity Map ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-card rounded-xl cyber-border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Case Activity Map</h2>
                <p className="text-[10px] text-muted-foreground">
                  {geoCount > 0
                    ? `${geoCount} GPS location${geoCount !== 1 ? "s" : ""} from evidence`
                    : "No GPS data yet"}
                </p>
              </div>
            </div>
            <Link to="/geospatial">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                Full Map
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {/* Map Legend */}
          {geoCount > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/20 border-b border-border text-[11px] shrink-0">
              {[
                { color: "#3b82f6", label: "Single point" },
                { color: "#f59e0b", label: "2 events" },
                { color: "#ef4444", label: "3+ events" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          )}

          <div className="h-44 md:h-64 relative bg-[#06080d]">
            {isLoadingCaseData ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {/* Background grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(185,255,242,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(185,255,242,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <div className="h-10 w-10 rounded-full border border-primary/20 animate-cyber-pulse flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary/40" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/40">Syncing Coords...</span>
                </div>
                {/* Scanning line */}
                <div className="absolute inset-x-0 h-[1.5px] bg-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] animate-scanline" />
              </div>
            ) : (
              <DashboardMiniMap />
            )}
          </div>
        </div>

        {/* ── Suspicious Messages ────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-card rounded-xl cyber-border flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <h2 className="text-sm font-semibold">Flagged Messages</h2>
            </div>
            <Badge variant="destructive" className="text-xs">
              {suspiciousItems.length}
            </Badge>
          </div>

          <ScrollArea className="flex-1 h-56">
            <div className="space-y-2 p-3">
              {isLoadingCaseData ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-2.5 space-y-2 border border-border/30 relative overflow-hidden">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-1/3 bg-destructive/10" />
                      <Skeleton className="h-3 w-10 bg-muted/20" />
                    </div>
                    <Skeleton className="h-3 w-full bg-muted/5" />
                    <Skeleton className="h-2 w-1/2 bg-muted/10 opacity-50" />
                  </div>
                ))
              ) : suspiciousItems.length > 0 ? (
                suspiciousItems.slice(0, 15).map((item, i) => {
                  const chat = item.record as any;
                  return (
                    <div
                      key={i}
                      className="bg-secondary/50 rounded-lg p-2.5 border-l-2 border-destructive/60"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono text-muted-foreground truncate flex-1">
                          {chat.from} → {chat.to}
                        </span>
                        <Badge
                          variant={item.severity === "high" ? "destructive" : "outline"}
                          className="text-[9px] h-4 shrink-0"
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2">{chat.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No suspicious items detected
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Foreign Numbers + Crypto Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl cyber-border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-yellow-500" />
            Foreign Numbers
            <Badge variant="outline" className="ml-auto text-[10px]">{foreignNumbers.length}</Badge>
          </h2>
          <div className="space-y-1.5 max-h-36 overflow-auto">
            {isLoadingCaseData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary/20 rounded px-3 py-1.5 opacity-60">
                   <Skeleton className="h-3 w-24 bg-yellow-500/10" />
                   <Skeleton className="h-3 w-8 bg-muted/20" />
                </div>
              ))
            ) : foreignNumbers.map((num, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-1.5">
                <span className="font-mono text-xs">{num}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {num.startsWith("+44") ? "🇬🇧 UK" : num.startsWith("+971") ? "🇦🇪 UAE" : num.startsWith("+86") ? "🇨🇳 CN" : num.startsWith("+41") ? "🇨🇭 CH" : "🌍 INT"}
                </Badge>
              </div>
            ))}
            {foreignNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">None detected</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl cyber-border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-primary" />
            Crypto Wallets
            <Badge variant="outline" className="ml-auto text-[10px]">{cryptoWallets.length}</Badge>
          </h2>
          <div className="space-y-1.5 max-h-36 overflow-auto">
            {isLoadingCaseData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-secondary/20 rounded px-3 py-1.5 opacity-60">
                   <Skeleton className="h-3 w-full bg-primary/10" />
                </div>
              ))
            ) : cryptoWallets.map((w, i) => (
              <div key={i} className="bg-secondary/50 rounded px-3 py-1.5 font-mono text-xs break-all">
                {w}
              </div>
            ))}
            {cryptoWallets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">None detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Platform breakdown */}
      {platforms.length > 0 && (
        <div className="bg-card rounded-xl cyber-border p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            Communication Platforms
          </h2>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const count = data.chats.filter((c) => c.platform === p).length;
              const pct = Math.round((count / data.chats.length) * 100);
              return (
                <div key={p} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{p}</span>
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investigation Tools */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Investigation Tools
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <FeatureCard to="/timeline" icon={Calendar} title="Timeline" description="Interactive event timeline with zoom and filters" />
          <FeatureCard to="/chat" icon={Brain} title="AI Assistant" description="Ask questions about the case in plain English" />
          <FeatureCard to="/geospatial" icon={MapPin} title="Full Map" description="Interactive map with GPS clusters and satellite view" />
          <FeatureCard to="/report" icon={FileText} title="Reports" description="Export investigation reports and summaries" />
          <FeatureCard to="/graph" icon={BarChart3} title="Network" description="Visualise contact relationships and communication links" />
          <FeatureCard to="/images" icon={Image} title="Media" description="Browse and analyse images with metadata extraction" />
        </div>
      </div>
    </div>
  );
}
