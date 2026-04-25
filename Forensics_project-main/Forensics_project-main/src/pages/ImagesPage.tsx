import { useMemo, useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Search, MapPin, Calendar } from "lucide-react";

export default function ImagesPage() {
  const { data } = useInvestigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredImages = useMemo(() => {
    if (!data) return [];
    
    return data.images.filter(img => {
      const matchesSearch = img.filename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !selectedType || img.filename.toLowerCase().includes(selectedType.toLowerCase());
      return matchesSearch && matchesType;
    });
  }, [data, searchTerm, selectedType]);

  const imageTypeStats = useMemo(() => {
    if (!data) return {};
    
    const stats: Record<string, number> = {};
    data.images.forEach(img => {
      const ext = img.filename.split(".").pop()?.toLowerCase() || "unknown";
      stats[ext] = (stats[ext] || 0) + 1;
    });
    return stats;
  }, [data]);

  // if (!data) return <Navigate to="/" replace />;


  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-black font-mono tracking-[0.2em] text-primary cyber-text-glow uppercase">
            Media Forensics
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          {data ? `${data.images.length} files found` : "No case data loaded"}
        </p>
      </div>


      {/* Controls */}
      <div className="p-4 border-b border-border space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search filenames..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1 text-sm rounded border font-mono ${
              selectedType === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            All Types
          </button>
          {Object.entries(imageTypeStats).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-sm rounded border font-mono ${
                selectedType === type
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent"
              }`}
            >
              .{type.toUpperCase()} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!data ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground border border-dashed rounded-lg bg-secondary/10">
            <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm font-mono">Select a case to view its media gallery</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No media files found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((img, idx) => (
              <div
                key={idx}
                className="border border-border rounded p-4 hover:border-primary transition-colors"
              >
                {/* ... existing card code ... */}
                <div className="mb-3 flex justify-center">
                  {img.url && img.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={img.url} alt={img.filename} className="w-full h-32 object-cover rounded-md mb-2 border border-border/50" />
                  ) : img.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="h-32 w-full flex flex-col items-center justify-center bg-secondary/50 rounded-md border border-dashed border-border/50">
                      <ImageIcon className="h-8 w-8 text-cyan-400 opacity-50 mb-2" />
                      <span className="text-[10px] text-muted-foreground uppercase opacity-50">Local Extracted Asset</span>
                    </div>
                  ) : img.filename.toLowerCase().match(/\.(mp4|mov|avi|mkv)$/i) ? (
                    <div className="h-32 w-full flex items-center justify-center text-xs font-bold bg-secondary/50 rounded-md border border-dashed border-yellow-400/20">
                      <div className="h-10 w-10 rounded-full border border-yellow-400 text-yellow-400 flex items-center justify-center">▶</div>
                    </div>
                  ) : img.filename.toLowerCase().match(/\.(mp3|wav|aac|flac)$/i) ? (
                    <div className="h-32 w-full flex items-center justify-center text-xs font-bold bg-secondary/50 rounded-md border border-dashed border-green-400/20">
                       <div className="h-10 w-10 rounded-full border border-green-400 text-green-400 flex items-center justify-center">🔊</div>
                    </div>
                  ) : (
                    <div className="h-32 w-full flex flex-col items-center justify-center bg-secondary/50 rounded-md border border-dashed border-border/50">
                      <ImageIcon className="h-8 w-8 text-gray-400 opacity-50" />
                    </div>
                  )}
                </div>

                {/* Filename */}
                <p className="font-mono text-sm text-foreground break-all mb-2">
                  {img.filename}
                </p>

                {/* Metadata */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  {img.timestamp && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(img.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                  {img.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {img.location.lat.toFixed(4)}, {img.location.lng.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {img.device && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-muted px-2 py-1 rounded">
                        {img.device}
                      </span>
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <div className="mt-3 pt-3 border-t border-border">
                  <Badge variant="outline" className="text-[10px]">
                    {img.filename.split(".").pop()?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
