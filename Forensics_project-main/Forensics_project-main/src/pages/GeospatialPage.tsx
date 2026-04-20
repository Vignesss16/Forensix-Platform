import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import GeospatialAnalysis from "@/components/GeospatialAnalysis";
import { ImageMetadata } from "@/lib/types";
import { toast } from "sonner";

export default function GeospatialPage() {
  const { data } = useInvestigation();




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
        {data ? (
          <GeospatialAnalysis
            records={data.rawRecords}
            onLocationClick={handleLocationClick}
          />
        ) : (
          <div className="flex items-center justify-center p-12 border border-dashed rounded-lg bg-card/30">
            <p className="text-muted-foreground italic">No geospatial data to display. Please select a case first.</p>
          </div>
        )}
      </div>

    </div>
  );
}