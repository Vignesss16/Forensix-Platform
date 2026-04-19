import React, { useState, useMemo } from "react";
import { Search, Filter, X, Save, Clock, Calendar, Users, MessageSquare, Phone, Image as ImageIcon } from "lucide-react";
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
  severity?: "low" | "medium" | "high";
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

    // Location filter
    if (criteria.hasLocation) {
      filtered = filtered.filter(record => {
        return record.type === "image" && (record as ImageMetadata).location;
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Advanced Search
          <Badge variant="outline" className="ml-auto">
            {performSearch.length} results
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="space-y-2">
          <Label htmlFor="query">Search Query</Label>
          <div className="flex gap-2">
            <Input
              id="query"
              placeholder="Search messages, contacts, or content..."
              value={criteria.query}
              onChange={(e) => setCriteria(prev => ({ ...prev, query: e.target.value }))}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCriteria(prev => ({ ...prev, regexMode: !prev.regexMode }))}
              className={criteria.regexMode ? "bg-primary/10" : ""}
            >
              .*
            </Button>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={criteria.caseSensitive}
                onCheckedChange={(checked) =>
                  setCriteria(prev => ({ ...prev, caseSensitive: !!checked }))
                }
              />
              Case sensitive
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={criteria.regexMode}
                onCheckedChange={(checked) =>
                  setCriteria(prev => ({ ...prev, regexMode: !!checked }))
                }
              />
              Regex mode
            </label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>

          {onSaveSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              disabled={!criteria.query && criteria.platforms.length === 0 && criteria.recordTypes.length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Search
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-1" />
            {showAdvanced ? "Hide" : "Show"} Filters
          </Button>
        </div>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Saved Searches</Label>
            <div className="flex gap-2 flex-wrap">
              {savedSearches.map(saved => (
                <Button
                  key={saved.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedSearch(saved)}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {saved.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="space-y-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <DatePickerWithRange
                date={criteria.dateRange}
                onDateChange={(dateRange) =>
                  setCriteria(prev => ({ ...prev, dateRange }))
                }
              />
            </div>

            {/* Record Types */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Record Types
              </Label>
              <div className="flex gap-2 flex-wrap">
                {["chat", "call", "contact", "image"].map(type => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={criteria.recordTypes.includes(type)}
                      onCheckedChange={() =>
                        setCriteria(prev => ({
                          ...prev,
                          recordTypes: toggleArrayFilter(prev.recordTypes, type)
                        }))
                      }
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </label>
                ))}
              </div>
            </div>

            {/* Platforms */}
            {uniquePlatforms.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Platforms
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {uniquePlatforms.map(platform => (
                    <label key={platform} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={criteria.platforms.includes(platform)}
                        onCheckedChange={() =>
                          setCriteria(prev => ({
                            ...prev,
                            platforms: toggleArrayFilter(prev.platforms, platform)
                          }))
                        }
                      />
                      {platform}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {uniqueContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts ({criteria.contacts.length} selected)
                </Label>
                <Select
                  value=""
                  onValueChange={(value) =>
                    setCriteria(prev => ({
                      ...prev,
                      contacts: toggleArrayFilter(prev.contacts, value)
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add contact filter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueContacts.map(contact => (
                      <SelectItem key={contact} value={contact}>
                        {contact}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {criteria.contacts.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {criteria.contacts.map(contact => (
                      <Badge
                        key={contact}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setCriteria(prev => ({
                            ...prev,
                            contacts: prev.contacts.filter(c => c !== contact)
                          }))
                        }
                      >
                        {contact} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Location Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Location Data
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={criteria.hasLocation}
                  onCheckedChange={(checked) =>
                    setCriteria(prev => ({ ...prev, hasLocation: !!checked }))
                  }
                />
                Only show records with location data
              </label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Save Dialog */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Save Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="saveName">Search Name</Label>
                  <Input
                    id="saveName"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Enter a name for this search..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSearch} disabled={!saveName.trim()}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
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