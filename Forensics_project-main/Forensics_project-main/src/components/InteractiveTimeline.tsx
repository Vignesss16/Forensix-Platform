import React, { useState, useRef, useEffect, useMemo } from "react";
import { ForensicRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Clock, MapPin, MessageSquare, Phone, User, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InteractiveTimelineProps {
  records: ForensicRecord[];
  onRecordClick?: (record: ForensicRecord) => void;
}

interface TimelineEvent {
  id: string;
  record: ForensicRecord;
  timestamp: Date;
  type: "chat" | "call" | "contact" | "image";
  title: string;
  description: string;
  severity?: "low" | "medium" | "high";
}

export default function InteractiveTimeline({ records, onRecordClick }: InteractiveTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ForensicRecord | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Convert records to timeline events
  const events = useMemo(() => {
    return records
      .filter(record => record.timestamp)
      .map((record, index) => {
        const timestamp = new Date(record.timestamp!);
        let title = "";
        let description = "";
        let severity: "low" | "medium" | "high" | undefined;

        switch (record.type) {
          case "chat":
            const chat = record as any;
            title = `${chat.from} → ${chat.to}`;
            description = chat.message;
            // Check for suspicious content
            if (description.toLowerCase().includes("bitcoin") ||
                description.toLowerCase().includes("crypto") ||
                description.match(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/)) {
              severity = "high";
            }
            break;
          case "call":
            const call = record as any;
            title = `Call: ${call.from} → ${call.to}`;
            description = `${call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "N/A"} · ${call.direction || "unknown"}`;
            break;
          case "contact":
            const contact = record as any;
            title = `Contact: ${contact.name}`;
            description = `${contact.phone}${contact.organization ? ` · ${contact.organization}` : ""}`;
            break;
          case "image":
            const image = record as any;
            title = `Image: ${image.filename}`;
            description = `${image.device || "Unknown device"}${image.location ? ` · 📍 ${image.location.lat.toFixed(2)}, ${image.location.lng.toFixed(2)}` : ""}`;
            break;
        }

        return {
          id: `${record.type}-${index}`,
          record,
          timestamp,
          type: record.type,
          title,
          description,
          severity
        } as TimelineEvent;
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [records]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    events.forEach(event => {
      const dateKey = event.timestamp.toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Calculate time range
  const dateRange = useMemo(() => {
    if (events.length === 0) return null;
    const dates = events.map(e => e.timestamp);
    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }, [events]);

  // Filter events by time range
  const filteredEvents = useMemo(() => {
    if (!timeRange) return events;
    return events.filter(event =>
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );
  }, [events, timeRange]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleRecordClick = (record: ForensicRecord) => {
    setSelectedRecord(record);
    onRecordClick?.(record);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "chat": return <MessageSquare className="h-3 w-3" />;
      case "call": return <Phone className="h-3 w-3" />;
      case "contact": return <User className="h-3 w-3" />;
      case "image": return <ImageIcon className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high": return "border-red-500 bg-red-500/10";
      case "medium": return "border-yellow-500 bg-yellow-500/10";
      case "low": return "border-green-500 bg-green-500/10";
      default: return "border-gray-500 bg-gray-500/10";
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No timeline events to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filteredEvents.length} events</span>
          {dateRange && (
            <span>
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
      >
        <div className="space-y-8">
          {Object.entries(eventsByDate).map(([dateKey, dayEvents]) => {
            const date = new Date(dateKey);
            const isSelectedDate = selectedDate?.toDateString() === dateKey;

            return (
              <div key={dateKey} className="relative">
                {/* Date Header */}
                <div
                  className={`flex items-center gap-4 mb-4 p-2 rounded cursor-pointer transition-colors ${
                    isSelectedDate ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                  }`}
                  onClick={() => setSelectedDate(isSelectedDate ? null : date)}
                >
                  <div className="text-sm font-mono font-bold text-primary">
                    {date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </div>
                  <div className="flex-1 border-b border-border" />
                  <Badge variant="outline" className="text-xs">
                    {dayEvents.length} events
                  </Badge>
                </div>

                {/* Events */}
                <div className="ml-8 space-y-3">
                  {dayEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative border-l-2 pl-4 py-3 cursor-pointer transition-all hover:shadow-md rounded-r ${
                        getSeverityColor(event.severity)
                      } ${selectedRecord?.timestamp === event.record.timestamp ? "ring-2 ring-primary" : ""}`}
                      onClick={() => handleRecordClick(event.record)}
                    >
                      {/* Time */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {event.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        <div className={`p-1 rounded ${event.severity ? "bg-destructive/20" : "bg-secondary"}`}>
                          {getEventIcon(event.type)}
                        </div>
                        {event.severity && (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            {event.severity}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      {/* Location indicator for images */}
                      {event.type === "image" && (event.record as any).location && (
                        <div className="absolute -left-2 top-3">
                          <MapPin className="h-3 w-3 text-red-500" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Record Details */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getEventIcon(selectedRecord.type)}
                  Record Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Type:</strong> {selectedRecord.type}</div>
                  <div><strong>Timestamp:</strong> {selectedRecord.timestamp ? new Date(selectedRecord.timestamp).toLocaleString() : "N/A"}</div>

                  {selectedRecord.type === "chat" && (
                    <>
                      <div><strong>From:</strong> {(selectedRecord as any).from}</div>
                      <div><strong>To:</strong> {(selectedRecord as any).to}</div>
                      <div><strong>Platform:</strong> {(selectedRecord as any).platform || "N/A"}</div>
                      <div><strong>Message:</strong></div>
                      <div className="bg-secondary p-2 rounded mt-1">
                        {(selectedRecord as any).message}
                      </div>
                    </>
                  )}

                  {selectedRecord.type === "call" && (
                    <>
                      <div><strong>From:</strong> {(selectedRecord as any).from}</div>
                      <div><strong>To:</strong> {(selectedRecord as any).to}</div>
                      <div><strong>Duration:</strong> {(selectedRecord as any).duration ? `${Math.floor((selectedRecord as any).duration / 60)}m ${(selectedRecord as any).duration % 60}s` : "N/A"}</div>
                      <div><strong>Direction:</strong> {(selectedRecord as any).direction || "unknown"}</div>
                    </>
                  )}

                  {selectedRecord.type === "contact" && (
                    <>
                      <div><strong>Name:</strong> {(selectedRecord as any).name}</div>
                      <div><strong>Phone:</strong> {(selectedRecord as any).phone}</div>
                      <div><strong>Email:</strong> {(selectedRecord as any).email || "N/A"}</div>
                      <div><strong>Organization:</strong> {(selectedRecord as any).organization || "N/A"}</div>
                    </>
                  )}

                  {selectedRecord.type === "image" && (
                    <>
                      <div><strong>Filename:</strong> {(selectedRecord as any).filename}</div>
                      <div><strong>Device:</strong> {(selectedRecord as any).device || "N/A"}</div>
                      {(selectedRecord as any).location && (
                        <div><strong>Location:</strong> {(selectedRecord as any).location.lat.toFixed(6)}, {(selectedRecord as any).location.lng.toFixed(6)}</div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}