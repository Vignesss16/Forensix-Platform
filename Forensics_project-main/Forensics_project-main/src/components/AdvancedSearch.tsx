import React, { useState, useMemo } from "react";
import { Search, Filter, X, Save, Clock, Calendar, Users, MessageSquare, Phone, Image as ImageIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { ForensicRecord, ChatRecord, CallRecord, ContactRecord, ImageMetadata } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export interface SearchCriteria {
  query: string;
  dateRange?: DateRange;
  platforms: string[];
  recordTypes: string[];
  contacts: string[];
  severity?: "Low" | "Medium" | "High";
  hasLocation?: boolean;
  regexMode: boolean;
  caseSensitive: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  criteria: SearchCriteria;
  createdAt: Date;
}

interface AdvancedSearchProps {
  records: ForensicRecord[];
  onResultsChange: (results: ForensicRecord[]) => void;
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string, criteria: SearchCriteria) => void;
  onDeleteSavedSearch?: (id: string) => void;
}

export default function AdvancedSearch({
  records,
  onResultsChange,
  savedSearches = [],
  onSaveSearch,
  onDeleteSavedSearch
}: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    query: "",
    platforms: [],
    recordTypes: [],
    contacts: [],
    regexMode: false,
    caseSensitive: false,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Extract unique values for filters
  const uniquePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    records.forEach(record => {
      if (record.type === "chat" && (record as ChatRecord).platform) {
        platforms.add((record as ChatRecord).platform!);
      }
    });
    return Array.from(platforms).sort();
  }, [records]);

  const uniqueContacts = useMemo(() => {
    const contacts = new Set<string>();
    records.forEach(record => {
      if (record.type === "chat") {
        contacts.add((record as ChatRecord).from);
        contacts.add((record as ChatRecord).to);
      } else if (record.type === "call") {
        contacts.add((record as CallRecord).from);
        contacts.add((record as CallRecord).to);
      } else if (record.type === "contact") {
        contacts.add((record as ContactRecord).phone);
      }
    });
    return Array.from(contacts).sort();
  }, [records]);

  // Search function
  const performSearch = useMemo(() => {
    let filtered = [...records];

    // Text query
    if (criteria.query) {
      const query = criteria.caseSensitive ? criteria.query : criteria.query.toLowerCase();
      filtered = filtered.filter(record => {
        let searchableText = "";

        if (record.type === "chat") {
          const chat = record as ChatRecord;
          searchableText = `${chat.from} ${chat.to} ${chat.message} ${chat.platform || ""}`;
        } else if (record.type === "call") {
          const call = record as CallRecord;
          searchableText = `${call.from} ${call.to} ${call.direction || ""}`;
        } else if (record.type === "contact") {
          const contact = record as ContactRecord;
          searchableText = `${contact.name} ${contact.phone} ${contact.email || ""} ${contact.organization || ""}`;
        } else if (record.type === "image") {
          const image = record as ImageMetadata;
          searchableText = `${image.filename} ${image.device || ""}`;
        }

        if (!criteria.caseSensitive) {
          searchableText = searchableText.toLowerCase();
        }

        if (criteria.regexMode) {
          try {
            const regex = new RegExp(query, criteria.caseSensitive ? "g" : "gi");
            return regex.test(searchableText);
          } catch {
            return searchableText.includes(query);
          }
        } else {
          return searchableText.includes(query);
        }
      });
    }

    // Date range filter
    if (criteria.dateRange?.from) {
      const fromDate = criteria.dateRange.from;
      const toDate = criteria.dateRange.to || criteria.dateRange.from;

      filtered = filtered.filter(record => {
        if (!record.timestamp) return false;
        const recordDate = new Date(record.timestamp);
        return recordDate >= fromDate && recordDate <= addDays(toDate, 1);
      });
    }

    // Platform filter
    if (criteria.platforms.length > 0) {
      filtered = filtered.filter(record => {
        if (record.type !== "chat") return false;
        const platform = (record as ChatRecord).platform;
        return platform && criteria.platforms.includes(platform);
      });
    }

    // Record type filter
    if (criteria.recordTypes.length > 0) {
      filtered = filtered.filter(record => criteria.recordTypes.includes(record.type));
    }

    // Contact filter
    if (criteria.contacts.length > 0) {
      filtered = filtered.filter(record => {
        if (record.type === "chat") {
          const chat = record as ChatRecord;
          return criteria.contacts.includes(chat.from) || criteria.contacts.includes(chat.to);
        } else if (record.type === "call") {
          const call = record as CallRecord;
          return criteria.contacts.includes(call.from) || criteria.contacts.includes(call.to);
        } else if (record.type === "contact") {
          const contact = record as ContactRecord;
          return criteria.contacts.includes(contact.phone);
        }
        return false;
      });
    }

    // Severity filter
    if (criteria.severity) {
      filtered = filtered.filter(record => {
        // Logic depends on what records have severity
        // Usually suspicious items (chats) have severity
        return true; // Simplified for now as data structure varies
      });
    }

    return filtered;
  }, [records, criteria]);

  // Update results when search changes
  React.useEffect(() => {
    onResultsChange(performSearch);
  }, [performSearch, onResultsChange]);

  const handleSaveSearch = () => {
    if (saveName.trim() && onSaveSearch) {
      onSaveSearch(saveName.trim(), criteria);
      setSaveName("");
      setSaveDialogOpen(false);
    }
  };

  const loadSavedSearch = (saved: SavedSearch) => {
    setCriteria(saved.criteria);
  };

  const clearFilters = () => {
    setCriteria({
      query: "",
      platforms: [],
      recordTypes: [],
      contacts: [],
      regexMode: false,
      caseSensitive: false,
    });
  };

  const toggleArrayFilter = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  return (
    <Card className="w-full border-primary/20 bg-card/30 backdrop-blur-sm overflow-hidden cyber-border">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-mono tracking-widest uppercase text-primary">
            <Search className="h-5 w-5 animate-pulse" />
            Intelligence Filters
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary bg-primary/5">
            {performSearch.length} RECORDS FOUND
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Basic Search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="query" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Master Query String</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="regex" 
                  checked={criteria.regexMode} 
                  onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, regexMode: !!checked }))}
                />
                <label htmlFor="regex" className="text-[10px] font-mono uppercase cursor-pointer">Regex Mode</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="case" 
                  checked={criteria.caseSensitive} 
                  onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, caseSensitive: !!checked }))}
                />
                <label htmlFor="case" className="text-[10px] font-mono uppercase cursor-pointer">Case Sensitive</label>
              </div>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
            <Input
              id="query"
              placeholder="IDENTIFY PATTERNS, KEYWORDS, OR SYSTEM IDS..."
              value={criteria.query}
              onChange={(e) => setCriteria(prev => ({ ...prev, query: e.target.value }))}
              className="pl-11 h-12 bg-secondary/30 border-primary/10 focus:border-primary/40 transition-all font-mono text-sm placeholder:opacity-30 rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] font-mono uppercase tracking-widest gap-2 hover:bg-primary/5 h-8"
          >
            <Filter className={`h-3.5 w-3.5 ${showAdvanced ? 'text-primary' : ''}`} />
            {showAdvanced ? 'Collapse Advanced Parameters' : 'Expand Advanced Parameters'}
          </Button>
          <div className="h-px flex-1 bg-border/30" />
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[10px] font-mono uppercase text-muted-foreground hover:text-destructive h-8">
            Reset All
          </Button>
        </div>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Platforms */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black font-mono tracking-widest text-primary/70 flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" /> CHANNELS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {uniquePlatforms.map(p => (
                    <Badge
                      key={p}
                      variant={criteria.platforms.includes(p) ? "default" : "outline"}
                      className={`cursor-pointer font-mono text-[9px] uppercase h-7 px-3 transition-all ${
                        criteria.platforms.includes(p) ? 'cyber-glow bg-primary border-primary' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setCriteria(prev => ({ ...prev, platforms: toggleArrayFilter(prev.platforms, p) }))}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Record Types */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black font-mono tracking-widest text-primary/70 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> DATA OBJECTS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["chat", "call", "contact", "image"].map(type => (
                    <Badge
                      key={type}
                      variant={criteria.recordTypes.includes(type) ? "default" : "outline"}
                      className={`cursor-pointer font-mono text-[9px] uppercase h-7 px-3 transition-all ${
                        criteria.recordTypes.includes(type) ? 'cyber-glow bg-primary border-primary' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setCriteria(prev => ({ ...prev, recordTypes: toggleArrayFilter(prev.recordTypes, type) }))}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black font-mono tracking-widest text-primary/70 flex items-center gap-2">
                  <Shield className="h-3 w-3" /> RISK LEVEL
                </h4>
                <Select 
                  value={criteria.severity || "all"} 
                  onValueChange={(val) => setCriteria(prev => ({ ...prev, severity: val === "all" ? undefined : val as any }))}
                >
                  <SelectTrigger className="h-9 bg-secondary/30 border-primary/10 font-mono text-[10px] uppercase">
                    <SelectValue placeholder="Select Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="all" className="font-mono text-[10px] uppercase">All Risks</SelectItem>
                    <SelectItem value="High" className="font-mono text-[10px] uppercase text-destructive">Critical Priority</SelectItem>
                    <SelectItem value="Medium" className="font-mono text-[10px] uppercase text-orange-500">Elevated Priority</SelectItem>
                    <SelectItem value="Low" className="font-mono text-[10px] uppercase text-blue-500">Standard Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                <h4 className="text-[10px] font-black font-mono tracking-widest text-primary/70 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> TEMPORAL WINDOW
                </h4>
                <DatePickerWithRange 
                  date={criteria.dateRange} 
                  setDate={(range) => setCriteria(prev => ({ ...prev, dateRange: range }))}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black font-mono tracking-widest text-primary/70 flex items-center gap-2">
                  <Users className="h-3 w-3" /> CONTACT ENTITIES
                </h4>
                <Select onValueChange={(val) => setCriteria(prev => ({ ...prev, contacts: toggleArrayFilter(prev.contacts, val) }))}>
                  <SelectTrigger className="h-9 bg-secondary/30 border-primary/10 font-mono text-[10px] uppercase">
                    <SelectValue placeholder="Filter by Entity" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    {uniqueContacts.slice(0, 50).map(c => (
                      <SelectItem key={c} value={c} className="font-mono text-[10px]">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {criteria.contacts.map(c => (
                    <Badge key={c} variant="secondary" className="text-[8px] bg-primary/10 text-primary border-primary/20">
                      {c} <X className="h-2 w-2 ml-1 cursor-pointer" onClick={() => setCriteria(prev => ({ ...prev, contacts: prev.contacts.filter(v => v !== c) }))} />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Save Dialog */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-sm border-primary/20 bg-card/90 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Archive Intelligence Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="saveName" className="text-[10px] font-mono uppercase opacity-50 mb-1 block">Identifier</Label>
                  <Input
                    id="saveName"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="E.G. SUSPICIOUS_CRYPTO_MAY"
                    className="bg-secondary/30 border-primary/10 font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveSearch} disabled={!saveName.trim()} className="flex-1 font-mono text-[10px] uppercase">
                    Archive Search
                  </Button>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="flex-1 font-mono text-[10px] uppercase">
                    Discard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
