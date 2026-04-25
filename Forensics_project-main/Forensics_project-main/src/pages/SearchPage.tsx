import { useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { useNavigate } from "react-router-dom";
import AdvancedSearch from "@/components/AdvancedSearch";
import { ForensicRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Upload, Sparkles } from "lucide-react";

export default function SearchPage() {
  const { data } = useInvestigation();
  const [searchResults, setSearchResults] = useState<ForensicRecord[]>([]);
  const navigate = useNavigate();

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-primary cyber-text-glow flex items-center gap-2">
          <Search className="h-6 w-6" />
          Advanced Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search through all forensic records with advanced filters and criteria
        </p>
      </div>

      {data ? (
        <AdvancedSearch
          records={data.rawRecords}
          onResultsChange={setSearchResults}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-card/30 space-y-8 cyber-border">
          <div className="text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-mono">No investigation data available.</p>
            <p className="text-xs text-muted-foreground mt-2">Active investigation data is required to perform searches.</p>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => navigate("/upload")} className="font-mono gap-2 cyber-glow">
              <Upload className="h-4 w-4" />
              Upload UFDR
            </Button>
            <Button onClick={() => navigate("/upload")} variant="outline" className="font-mono gap-2">
              <Sparkles className="h-4 w-4" />
              Load Sample Data
            </Button>
          </div>
        </div>
      )}



      <div className="grid gap-4 mt-6">
        <h2 className="text-lg font-bold">Results ({searchResults.length})</h2>
        {searchResults.slice(0, 50).map((result, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4 flex gap-4 flex-col sm:flex-row">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{result.type}</Badge>
                  {('timestamp' in result && result.timestamp) && <span className="text-xs text-muted-foreground">{new Date((result as any).timestamp).toLocaleString()}</span>}
                </div>
                {result.type === "chat" && (
                  <div>
                    <p className="text-sm"><strong>From:</strong> {(result as any).from} <strong>To:</strong> {(result as any).to}</p>
                    <p className="text-sm mt-1 bg-secondary/30 p-2 rounded">{(result as any).message}</p>
                  </div>
                )}
                {result.type === "call" && (
                  <div>
                    <p className="text-sm"><strong>From:</strong> {(result as any).from} <strong>To:</strong> {(result as any).to}</p>
                    <p className="text-sm mt-1">Duration: {(result as any).duration}s | Direction: {(result as any).direction}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {searchResults.length > 50 && (
          <p className="text-muted-foreground text-sm text-center">Showing top 50 results. Please refine your search.</p>
        )}
      </div>
    </div>
  );
}