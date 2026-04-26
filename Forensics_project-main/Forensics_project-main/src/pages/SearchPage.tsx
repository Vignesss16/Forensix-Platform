import { useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { useNavigate } from "react-router-dom";
import AdvancedSearch from "@/components/AdvancedSearch";
import { ForensicRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Upload, Sparkles, MessageSquare, Phone, Users } from "lucide-react";

export default function SearchPage() {
  const { data } = useInvestigation();
  const [searchResults, setSearchResults] = useState<ForensicRecord[]>([]);
  const navigate = useNavigate();

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 pb-4 pt-2">
        <h1 className="text-xl md:text-2xl font-black font-mono tracking-[0.2em] text-primary cyber-text-glow flex items-center gap-3 uppercase">
          <Search className="h-6 w-6" />
          Advanced Search
        </h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60 font-mono">
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
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black font-mono tracking-widest text-primary uppercase">Investigation Results ({searchResults.length})</h2>
          {searchResults.length > 0 && (
            <p className="text-[9px] text-muted-foreground font-mono opacity-50 uppercase tracking-tighter">DISPLAYING PEAK RELEVANCE</p>
          )}
        </div>

        {searchResults.length === 0 ? (
          <div className="py-20 text-center opacity-20">
            <Search className="h-12 w-12 mx-auto mb-4" />
            <p className="text-xs font-mono uppercase tracking-[0.2em]">No Intelligence Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {searchResults.slice(0, 50).map((result, idx) => {
              const isChat = result.type === "chat";
              const isCall = result.type === "call";
              const isContact = result.type === "contact";
              const isImage = result.type === "image";

              return (
                <Card key={idx} className="overflow-hidden border-primary/5 bg-card/10 hover:bg-card/20 transition-all group relative">
                  <div className="absolute left-0 top-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  <CardContent className="p-4 flex gap-4">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center border border-primary/10">
                      {isChat && <MessageSquare className="h-4 w-4 text-primary" />}
                      {isCall && <Phone className="h-4 w-4 text-primary" />}
                      {isContact && <Users className="h-4 w-4 text-primary" />}
                      {isImage && <Sparkles className="h-4 w-4 text-primary" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className="text-[8px] h-4 font-mono uppercase border-primary/20 text-primary/60">
                          {result.type} object
                        </Badge>
                        {('timestamp' in result && result.timestamp) && (
                          <span className="text-[10px] text-muted-foreground/40 font-mono">
                            {new Date((result as any).timestamp).toISOString()}
                          </span>
                        )}
                      </div>

                      {isChat && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-primary">{(result as any).from}</span>
                            <span className="text-muted-foreground opacity-30">→</span>
                            <span className="font-bold">{(result as any).to}</span>
                            <Badge variant="secondary" className="text-[8px] opacity-40">{(result as any).platform}</Badge>
                          </div>
                          <p className="text-sm font-medium leading-relaxed mt-2 p-3 rounded-lg bg-secondary/20 border border-primary/5 italic">
                            "{(result as any).message}"
                          </p>
                        </div>
                      )}

                      {isCall && (
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase opacity-50">Originator</p>
                            <p className="font-bold">{(result as any).from}</p>
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase opacity-50">Recipient</p>
                            <p className="font-bold">{(result as any).to}</p>
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase opacity-50">Duration</p>
                            <p className="font-bold">{(result as any).duration}s</p>
                          </div>
                        </div>
                      )}

                      {isContact && (
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-bold text-primary">{(result as any).name}</p>
                          <p className="text-sm font-mono opacity-60">{(result as any).phone}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {searchResults.length > 50 && (
          <div className="p-4 border border-dashed border-border rounded-xl text-center">
            <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
              Security Buffer: Display limited to 50 entries. Refine search for specific targets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}