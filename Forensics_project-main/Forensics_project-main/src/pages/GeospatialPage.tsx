import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import GeospatialAnalysis from "@/components/GeospatialAnalysis";
import { ImageMetadata } from "@/lib/types";
import { toast } from "sonner";

export default function GeospatialPage() {
  const { data } = useInvestigation();

  if (!data) return <Navigate to="/" replace />;

  const handleLocationClick = (record: ImageMetadata) => {
    toast.info(`Selected: ${record.filename}`, {
      description: record.device ?? "Unknown device",
    });
  };

  return (
    <div className="p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold font-mono text-primary cyber-text-glow">
          Geospatial Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          GPS coordinates extracted from media files — click a location to
          inspect it
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <GeospatialAnalysis
          records={data.rawRecords}
          onLocationClick={handleLocationClick}
        />
      </div>
    </div>
  );
}