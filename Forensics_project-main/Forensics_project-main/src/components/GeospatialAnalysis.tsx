import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ForensicRecord, ImageMetadata } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Layers,
  Image as ImageIcon,
  Activity,
  Search,
  Download,
  Filter,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import L from "leaflet";
import { motion } from "framer-motion";

// ─── Fix default marker icons ─────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ─── Custom coloured marker icons ────────────────────────────────────────────
function makeIcon(color: string) {
  return L.divIcon({
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const icons = {
  single: makeIcon("#3b82f6"),
  cluster2: makeIcon("#f59e0b"),
  cluster5: makeIcon("#ef4444"),
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface LocationData {
  id: string;
  record: ImageMetadata;
  position: [number, number];
  timestamp: string;
  device?: string;
  filename: string;
}

interface GeospatialAnalysisProps {
  records: ForensicRecord[];
  onLocationClick?: (record: ImageMetadata) => void;
  compact?: boolean; // for dashboard mini-map mode
}

// ─── Map Controls ─────────────────────────────────────────────────────────────
function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
      {[
        { icon: ZoomIn, action: onZoomIn, label: "Zoom in" },
        { icon: ZoomOut, action: onZoomOut, label: "Zoom out" },
        { icon: RotateCcw, action: onReset, label: "Reset view" },
      ].map(({ icon: Icon, action, label }) => (
        <button
          key={label}
          onClick={action}
          title={label}
          className="h-8 w-8 rounded-md bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─── Map Controller (imperative) ──────────────────────────────────────────────
function MapController({
  locations,
  flyTarget,
}: {
  locations: LocationData[];
  flyTarget: [number, number] | null;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, 14, { duration: 1.2 });
    }
  }, [flyTarget, map]);

  React.useEffect(() => {
    if (locations.length > 0) {
      const valid = locations.filter(
        (l) =>
          !isNaN(l.position[0]) &&
          !isNaN(l.position[1])
      );
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map((l) => l.position));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [locations, map]);

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeospatialAnalysis({
  records,
  onLocationClick,
  compact = false,
}: GeospatialAnalysisProps) {
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [mapType, setMapType] = useState<"streets" | "satellite" | "dark">(
    "streets"
  );
  const [showClusters, setShowClusters] = useState(true);
  const [search, setSearch] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const mapRef = useRef<L.Map | null>(null);

  // Extract location data from image records
  const locationData = useMemo<LocationData[]>(() => {
    return records
      .filter(
        (record): record is ImageMetadata =>
          record.type === "image" && !!(record as ImageMetadata).location
      )
      .map((image, index) => ({
        id: `location-${index}`,
        record: image,
        position: [image.location!.lat, image.location!.lng] as [number, number],
        timestamp: image.timestamp || "",
        device: image.device,
        filename: image.filename,
      }));
  }, [records]);

  // Unique devices
  const devices = useMemo(() => {
    const s = new Set<string>();
    locationData.forEach((l) => l.device && s.add(l.device));
    return [...s];
  }, [locationData]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    let locs = locationData;
    if (selectedDevice !== "all")
      locs = locs.filter((l) => l.device === selectedDevice);
    if (search.trim())
      locs = locs.filter(
        (l) =>
          l.filename.toLowerCase().includes(search.toLowerCase()) ||
          l.device?.toLowerCase().includes(search.toLowerCase())
      );
    return locs;
  }, [locationData, selectedDevice, search]);

  // Build clusters for heatmap circles
  const clusters = useMemo(() => {
    const map: Record<string, LocationData[]> = {};
    filteredLocations.forEach((loc) => {
      const key = `${Math.round(loc.position[0] * 10) / 10}_${Math.round(loc.position[1] * 10) / 10}`;
      if (!map[key]) map[key] = [];
      map[key].push(loc);
    });
    return map;
  }, [filteredLocations]);

  // Stats
  const stats = useMemo(() => {
    if (locationData.length === 0) return null;
    const dates = locationData
      .filter((l) => l.timestamp)
      .map((l) => new Date(l.timestamp).getTime());
    const span =
      dates.length > 0
        ? Math.ceil(
            (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)
          )
        : 0;
    return {
      total: locationData.length,
      devices: devices.length,
      span,
    };
  }, [locationData, devices]);

  // Tile URLs
  const tiles = {
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri",
    },
    dark: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap contributors",
    },
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      "Filename,Device,Latitude,Longitude,Timestamp",
      ...filteredLocations.map(
        (l) =>
          `"${l.filename}","${l.device || ""}",${l.position[0]},${l.position[1]},"${l.timestamp}"`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
    a.download = "forensix-locations.csv";
    a.click();
  };

  const flyTo = (loc: LocationData) => {
    setFlyTarget(loc.position);
    setActiveLocationId(loc.id);
  };

  // Default center — India if no data
  const defaultCenter: [number, number] =
    filteredLocations.length > 0
      ? filteredLocations[0].position
      : [20.5937, 78.9629]; // India center

  if (!compact && locationData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No location data available</p>
          <p className="text-sm mt-1 text-muted-foreground">
            Image files with GPS/EXIF coordinates will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${compact ? "" : "h-[calc(100dvh-12rem)] md:h-[calc(100vh-10rem)]"}`}>
      {/* Stats Strip */}
      {!compact && stats && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { label: "GPS Points", value: stats.total, icon: MapPin },
            { label: "Devices", value: stats.devices, icon: ImageIcon },
            {
              label: "Date Span",
              value: `${stats.span} day${stats.span !== 1 ? "s" : ""}`,
              icon: Activity,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Controls Bar */}
      {!compact && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files or devices…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-44 h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All devices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={mapType}
            onValueChange={(v) => setMapType(v as typeof mapType)}
          >
            <SelectTrigger className="w-36 h-9">
              <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streets">🗺 Streets</SelectItem>
              <SelectItem value="satellite">🛰 Satellite</SelectItem>
              <SelectItem value="dark">🌑 Dark</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showClusters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowClusters((s) => !s)}
            className="h-9 gap-1.5"
          >
            <Activity className="h-3.5 w-3.5" />
            Heatmap
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Badge variant="outline" className="h-9 px-3 font-mono text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            {filteredLocations.length} point{filteredLocations.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {/* Map + Sidebar */}
      <div
        className={`flex flex-col md:flex-row gap-4 ${compact ? "h-full" : "flex-1 min-h-0"}`}
      >
        {/* Location List Sidebar */}
        {!compact && (
          <div className="w-full md:w-64 shrink-0 flex flex-col border border-border rounded-xl overflow-hidden bg-card max-h-[30vh] md:max-h-none">
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Locations
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-3">
                  No locations match your filter
                </p>
              ) : (
                filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => flyTo(loc)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-secondary/50 transition-colors group ${
                      activeLocationId === loc.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin
                        className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-colors ${
                          activeLocationId === loc.id
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {loc.filename}
                        </p>
                        {loc.device && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {loc.device}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                          {loc.position[0].toFixed(4)},{" "}
                          {loc.position[1].toFixed(4)}
                        </p>
                      </div>
                      <Navigation className="h-3 w-3 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ml-auto" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Map Pane */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-border shadow-sm">
          {locationData.length === 0 && compact ? (
            <div className="h-full flex items-center justify-center bg-muted/20 text-muted-foreground">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No GPS data in this case</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={locationData.length === 0 ? 4 : 11}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              ref={mapRef}
            >
              <TileLayer
                url={tiles[mapType].url}
                attribution={tiles[mapType].attribution}
              />

              <MapController
                locations={filteredLocations}
                flyTarget={flyTarget}
              />

              {/* Markers */}
              {filteredLocations.map((loc) => {
                const clusterKey = `${Math.round(loc.position[0] * 10) / 10}_${Math.round(loc.position[1] * 10) / 10}`;
                const clusterSize = clusters[clusterKey]?.length ?? 1;
                const icon =
                  clusterSize >= 5
                    ? icons.cluster5
                    : clusterSize >= 2
                    ? icons.cluster2
                    : icons.single;

                return (
                  <Marker
                    key={loc.id}
                    position={loc.position}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        onLocationClick?.(loc.record);
                        setActiveLocationId(loc.id);
                      },
                    }}
                  >
                    <Popup maxWidth={260} className="forensic-popup">
                      <div className="space-y-2 min-w-[200px]">
                        {loc.record.url && (
                          <img
                            src={loc.record.url}
                            alt={loc.filename}
                            className="w-full h-28 object-cover rounded-md"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display = "none")
                            }
                          />
                        )}
                        <div>
                          <p className="font-semibold text-sm">
                            {loc.filename}
                          </p>
                          {loc.device && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              📱 {loc.device}
                            </p>
                          )}
                          {loc.timestamp && (
                            <p className="text-xs text-gray-500">
                              🕐{" "}
                              {new Date(loc.timestamp).toLocaleString("en-IN")}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-gray-400 mt-1">
                            {loc.position[0].toFixed(6)},{" "}
                            {loc.position[1].toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Heatmap circles */}
              {showClusters &&
                Object.entries(clusters).map(([key, locs]) => {
                  if (locs.length < 2) return null;
                  const center = locs[0].position;
                  const count = locs.length;
                  const color =
                    count >= 5
                      ? "#ef4444"
                      : count >= 3
                      ? "#f59e0b"
                      : "#3b82f6";
                  return (
                    <Circle
                      key={key}
                      center={center}
                      radius={count * 80}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.15,
                        weight: 1.5,
                        dashArray: "4 2",
                      }}
                    >
                      <Popup>
                        <div className="text-center text-sm">
                          <strong>{count} items</strong> clustered here
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}

              {/* Custom map controls overlay */}
              {!compact && (
                <div className="hidden md:block">
                  <MapControls
                    onZoomIn={() => mapRef.current?.zoomIn()}
                    onZoomOut={() => mapRef.current?.zoomOut()}
                    onReset={() => {
                      setFlyTarget(null);
                      setActiveLocationId(null);
                      if (filteredLocations.length > 0) {
                        const bounds = L.latLngBounds(
                          filteredLocations.map((l) => l.position)
                        );
                        mapRef.current?.fitBounds(bounds, { padding: [40, 40] });
                      } else {
                        mapRef.current?.setView([20.5937, 78.9629], 4);
                      }
                    }}
                  />
                </div>
              )}
            </MapContainer>
          )}

          {/* Legend */}
          {!compact && locationData.length > 0 && (
            <div className="absolute bottom-3 left-3 z-[400] bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs space-y-1">
              <p className="font-medium text-muted-foreground mb-1">Legend</p>
              {[
                { color: "#3b82f6", label: "Single point" },
                { color: "#f59e0b", label: "2–4 clustered" },
                { color: "#ef4444", label: "5+ clustered" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}