import { useMemo, useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search, Calendar, Filter, Download } from "lucide-react";
import AdvancedSearch, { SearchCriteria } from "@/components/AdvancedSearch";
import InteractiveTimeline from "@/components/InteractiveTimeline";
import { ForensicRecord } from "@/lib/types";
import { toast } from "sonner";

export default function TimelinePage() {
  const { data, savedSearches, saveSearch, deleteSavedSearch } = useInvestigation();
  const [filteredRecords, setFilteredRecords] = useState<ForensicRecord[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const sortedRecords = useMemo(() => {
    if (!data) return [];
    return [...data.rawRecords].sort((a, b) => new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime());
  }, [data]);

  const recordsByDate = useMemo(() => {
    const grouped: Record<string, ForensicRecord[]> = {};
    filteredRecords.forEach(record => {
      if (!record.timestamp) return;
      const date = new Date(record.timestamp).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(record);
    });
    return Object.entries(grouped).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredRecords]);

  const exportTimeline = () => {
    const csvContent = [
      ["Date", "Time", "Type", "From", "To", "Content", "Platform"],
      ...filteredRecords.map(record => {
        const date = record.timestamp ? new Date(record.timestamp) : null;
        const dateStr = date ? date.toLocaleDateString() : "";
        const timeStr = date ? date.toLocaleTimeString() : "";

        if (record.type === "chat") {
          const chat = record as any;
          return [dateStr, timeStr, "Chat", chat.from, chat.to, chat.message, chat.platform || ""];
        } else if (record.type === "call") {
          const call = record as any;
          return [dateStr, timeStr, "Call", call.from, call.to, `${call.duration || 0}s ${call.direction || ""}`, ""];
        } else if (record.type === "contact") {
          const contact = record as any;
          return [dateStr, timeStr, "Contact", contact.name, contact.phone, contact.organization || "", ""];
        } else if (record.type === "image") {
          const image = record as any;
          return [dateStr, timeStr, "Image", image.filename, "", image.device || "", ""];
        }
        return [dateStr, timeStr, record.type, "", "", "", ""];
      }),
    ]
      .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `timeline_${Date.now()}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Timeline exported to CSV");
  };

  // if (!data) return <Navigate to="/" replace />;


  return (
    <div className="flex flex-col flex-1 min-h-0">
      {!data ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#0a0a0f]">
           <div className="relative mb-6">
              <Calendar className="h-16 w-16 text-primary/10 animate-pulse" />
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/20 animate-glow" />
           </div>
           <h2 className="text-xl font-mono text-primary/70 mb-2">Timeline Offline</h2>
           <p className="text-sm text-muted-foreground/60 max-w-sm mb-8">
             Select an active investigation case to generate a chronological forensic timeline.
           </p>
           <div className="flex gap-3 justify-center">
             <Button onClick={() => window.location.href='/upload'} variant="default" className="font-mono cyber-border">
               Upload Files
             </Button>
             <Button onClick={() => window.location.href='/upload'} variant="outline" className="font-mono cyber-border">
               Load Sample
             </Button>
           </div>

        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h1 className="text-xl md:text-2xl font-black font-mono tracking-[0.2em] text-primary cyber-text-glow uppercase">
                  Evidence Timeline
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showAdvancedSearch ? "Hide" : "Show"} Search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTimeline}
                  disabled={filteredRecords.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredRecords.length} records across {recordsByDate.length} days
            </p>
          </div>

          {/* Advanced Search */}
          {showAdvancedSearch && (
            <div className="p-4 border-b border-border">
              <AdvancedSearch
                records={sortedRecords}
                onResultsChange={setFilteredRecords}
                savedSearches={savedSearches}
                onSaveSearch={saveSearch}
                onDeleteSavedSearch={deleteSavedSearch}
              />
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-auto">
            {filteredRecords.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No records found</p>
                  <p className="text-xs mt-1">Try adjusting your search criteria</p>
                </div>
              </div>
            ) : (
              <InteractiveTimeline
                records={filteredRecords}
                onRecordClick={(record) => {
                  console.log("Record clicked:", record);
                  // Could open a modal with details
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );

}
