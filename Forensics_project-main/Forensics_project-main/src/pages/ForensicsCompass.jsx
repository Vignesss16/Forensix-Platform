import { useState, useEffect, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import gsap from "@/lib/gsap-utils";
import { useGSAP } from "@gsap/react";
import { Shield, Search, Plus, Link as LinkIcon, BarChart3, Download, Trash2, Filter, MapPin, ExternalLink, Calendar, Brain, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

// ── constants ──────────────────────────────────────────────────────────────────
const NODE_COLORS = {
  suspect: "#D85A30",
  evidence: "#378ADD",
  location: "#1D9E75",
  witness: "#7F77DD",
};

const NODE_LABELS = {
  suspect: "Suspect",
  evidence: "Evidence",
  location: "Location",
  witness: "Witness",
};

const INITIAL_NODES = [
  { id: "n1", name: "Marcus Webb", type: "suspect", note: "Last seen near scene" },
  { id: "n2", name: "Watch", type: "evidence", note: "Found at scene" },
  { id: "n3", name: "Warehouse", type: "location", note: "Primary scene" },
  { id: "n4", name: "Elena Ross", type: "witness", note: "Saw suspect flee" },
  { id: "n5", name: "Sara Kim", type: "suspect", note: "Known associate" },
];

const INITIAL_LINKS = [
  { source: "n1", target: "n2", label: "linked to" },
  { source: "n1", target: "n3", label: "visited" },
  { source: "n4", target: "n1", label: "identified" },
  { source: "n5", target: "n3", label: "connected to" },
  { source: "n2", target: "n3", label: "found at" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
let _nodeId = 6;
const nextId = () => `n${_nodeId++}`;

const initials = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ── main component ─────────────────────────────────────────────────────────────
export default function ForensicsCompass() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [links, setLinks] = useState(INITIAL_LINKS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);

  // add-node form
  const [nodeName, setNodeName] = useState("");
  const [nodeType, setNodeType] = useState("suspect");
  const [nodeNote, setNodeNote] = useState("");

  // add-link form
  const [linkFrom, setLinkFrom] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  const graphRef = useRef(null);

  // set default selects when nodes change
  useEffect(() => {
    if (nodes.length > 0 && !linkFrom) setLinkFrom(nodes[0].id);
    if (nodes.length > 1 && !linkTo) setLinkTo(nodes[1].id);
  }, [nodes]);

  // ── filtered graph data ──────────────────────────────────────────────────────
  const visibleNodes = filter === "all" ? nodes : nodes.filter((n) => n.type === filter);
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleLinks = links.filter(
    (l) =>
      visibleIds.has(typeof l.source === "object" ? l.source.id : l.source) &&
      visibleIds.has(typeof l.target === "object" ? l.target.id : l.target)
  );

  const graphData = { nodes: visibleNodes, links: visibleLinks };

  // ── search highlight ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setHighlightId(null); return; }
    const found = nodes.find((n) => n.name.toLowerCase().includes(search.toLowerCase()));
    setHighlightId(found ? found.id : null);
    if (found && graphRef.current) {
      graphRef.current.centerAt(found.x ?? 0, found.y ?? 0, 600);
      graphRef.current.zoom(2.5, 600);
    }
  }, [search, nodes]);

  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Page entrance
    tl.from(".compass-header", { y: -20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .fromTo(".compass-title", 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3 }
      ).to(".compass-title", {
        duration: 1.5,
        text: "FORENSICS COMPASS",
        ease: "none"
      }, "-=0.3")
      .from(".toolbar-item", { x: -10, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, "-=0.8")
      .from(".graph-container", { scale: 0.98, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.5")
      .from(".control-panel", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }, "-=0.6");

  }, { scope: containerRef });

  // ── add / remove ─────────────────────────────────────────────────────────────
  const addNode = () => {
    if (!nodeName.trim()) return;
    const newNode = { id: nextId(), name: nodeName.trim(), type: nodeType, note: nodeNote.trim() };
    setNodes((prev) => [...prev, newNode]);
    setNodeName(""); setNodeNote("");
  };

  const addLink = () => {
    if (!linkFrom || !linkTo || linkFrom === linkTo) return;
    setLinks((prev) => [...prev, { source: linkFrom, target: linkTo, label: linkLabel.trim() }]);
    setLinkLabel("");
  };

  const removeNode = useCallback((id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setLinks((prev) =>
      prev.filter((l) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return s !== id && t !== id;
      })
    );
  }, []);

  // ── canvas node rendering ────────────────────────────────────────────────────
  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const r = 12;
      const isHighlighted = node.id === highlightId;

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
        ctx.fillStyle = NODE_COLORS[node.type] + "44";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = NODE_COLORS[node.type];
      ctx.fill();

      const fontSize = Math.max(8, 10 / globalScale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(node.name), node.x, node.y);

      const labelSize = Math.max(7, 9 / globalScale);
      ctx.font = `${labelSize}px sans-serif`;
      ctx.fillStyle = "#888";
      ctx.textBaseline = "top";
      ctx.fillText(node.name, node.x, node.y + r + 2);
    },
    [highlightId]
  );

  // ── link label rendering ─────────────────────────────────────────────────────
  const paintLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    if (!start || !end || typeof start !== "object") return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = "rgba(128,128,128,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (link.label) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const fontSize = Math.max(6, 8 / globalScale);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(128,128,128,0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(link.label, mx, my - 2);
    }
  }, []);

  // ── stats ─────────────────────────────────────────────────────────────────────
  const stats = {
    suspect: nodes.filter((n) => n.type === "suspect").length,
    evidence: nodes.filter((n) => n.type === "evidence").length,
    location: nodes.filter((n) => n.type === "location").length,
    witness: nodes.filter((n) => n.type === "witness").length,
    links: links.length,
  };

  // ── PDF export ─────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString();
    let y = 20;

    const line = (text, indent = 0, size = 12, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, 14 + indent, y);
      y += size * 0.5 + 4;
      if (y > 270) { doc.addPage(); y = 20; }
    };

    const section = (title) => {
      y += 4;
      line(title, 0, 13, true);
      doc.setDrawColor(180);
      doc.line(14, y, 196, y);
      y += 5;
    };

    // header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("FORENSICS COMPASS", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Case Report  ·  Generated: ${now}`, 14, 27);
    doc.setTextColor(0, 0, 0);
    y = 45;

    // summary stats
    section("Case Summary");
    line(`Total entities: ${nodes.length}   |   Connections: ${links.length}`, 0, 11);
    y += 4;

    // suspects
    if (stats.suspect > 0) {
      section(`Suspects (${stats.suspect})`);
      nodes.filter((n) => n.type === "suspect").forEach((n) => {
        line(`• ${n.name}`, 2, 11, true);
        if (n.note) line(n.note, 6, 10);
      });
    }

    // evidence
    if (stats.evidence > 0) {
      section(`Evidence (${stats.evidence})`);
      nodes.filter((n) => n.type === "evidence").forEach((n) => {
        line(`• ${n.name}`, 2, 11, true);
        if (n.note) line(n.note, 6, 10);
      });
    }

    // locations
    if (stats.location > 0) {
      section(`Locations (${stats.location})`);
      nodes.filter((n) => n.type === "location").forEach((n) => {
        line(`• ${n.name}`, 2, 11, true);
        if (n.note) line(n.note, 6, 10);
      });
    }

    // witnesses
    if (stats.witness > 0) {
      section(`Witnesses (${stats.witness})`);
      nodes.filter((n) => n.type === "witness").forEach((n) => {
        line(`• ${n.name}`, 2, 11, true);
        if (n.note) line(n.note, 6, 10);
      });
    }

    // connections
    if (links.length > 0) {
      section("Connections");
      links.forEach((l) => {
        const sId = typeof l.source === "object" ? l.source.id : l.source;
        const tId = typeof l.target === "object" ? l.target.id : l.target;
        const a = nodes.find((n) => n.id === sId);
        const b = nodes.find((n) => n.id === tId);
        if (a && b) {
          const rel = l.label ? ` [${l.label}]` : "";
          line(`${a.name}  →  ${b.name}${rel}`, 2, 10);
        }
      });
    }

    doc.save("forensics-compass-report.pdf");
  };

  // ── node right-click context ───────────────────────────────────────────────
  const handleNodeRightClick = useCallback(
    (node) => {
      if (window.confirm(`Remove node "${node.name}"?`)) removeNode(node.id);
    },
    [removeNode]
  );

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" ref={containerRef}>
      {/* Header */}
      <div className="compass-header flex items-baseline gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-black font-mono text-primary tracking-widest uppercase compass-title">Forensics Compass</h1>
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-tighter opacity-60">Entity Relationship Mapper</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64 toolbar-item">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 font-mono text-xs" 
            placeholder="Search nodes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 toolbar-item">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("all")} 
            className="text-[10px] uppercase font-bold tracking-widest h-8"
          >
            All
          </Button>
          {Object.keys(NODE_LABELS).map((f) => (
            <Button 
              key={f}
              variant={filter === f ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter(f)}
              className="text-[10px] uppercase font-bold tracking-widest h-8"
            >
              {NODE_LABELS[f]}S
            </Button>
          ))}
        </div>
      </div>

      {/* Graph Area */}
      <Card className="graph-container border-primary/10 bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="h-[400px] relative">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => "replace"}
            linkCanvasObject={paintLink}
            linkCanvasObjectMode={() => "replace"}
            nodeRelSize={12}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            onNodeRightClick={handleNodeRightClick}
            backgroundColor="transparent"
            width={undefined}
            height={400}
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-white/5 backdrop-blur-md">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/70">
                <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span>{NODE_LABELS[type]}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/10 text-[8px] text-white/40 uppercase tracking-widest">
              Right-click node to remove
            </div>
          </div>
        </div>
      </Card>

      {/* Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Node */}
        <Card className="control-panel cyber-border bg-card/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Plus className="h-3 w-3" /> Add Entity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">Name</label>
              <Input className="h-8 text-xs font-mono" placeholder="Entity name..." value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">Type</label>
              <Select value={nodeType} onValueChange={setNodeType}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NODE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs font-mono">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">Note</label>
              <Input className="h-8 text-xs font-mono" placeholder="Optional notes..." value={nodeNote} onChange={(e) => setNodeNote(e.target.value)} />
            </div>
            <Button onClick={addNode} className="w-full h-8 text-[10px] font-bold tracking-widest mt-2 uppercase">Create Node</Button>
          </CardContent>
        </Card>

        {/* Add Link */}
        <Card className="control-panel cyber-border bg-card/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-3 w-3" /> Establish Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">From</label>
              <Select value={linkFrom} onValueChange={setLinkFrom}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => <SelectItem key={n.id} value={n.id} className="text-xs font-mono">{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">To</label>
              <Select value={linkTo} onValueChange={setLinkTo}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => <SelectItem key={n.id} value={n.id} className="text-xs font-mono">{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-muted-foreground ml-1">Relation</label>
              <Input className="h-8 text-xs font-mono" placeholder="witnessed, associate..." value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
            </div>
            <Button onClick={addLink} variant="secondary" className="w-full h-8 text-[10px] font-bold tracking-widest mt-2 uppercase">Connect</Button>
          </CardContent>
        </Card>

        {/* Stats & Export */}
        <Card className="control-panel cyber-border bg-card/20 border-primary/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-[10px] uppercase font-mono tracking-[0.2em] text-primary flex items-center gap-2">
              <BarChart3 className="h-3 w-3" /> Case Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-2">
              {[
                ["Suspects", stats.suspect, NODE_COLORS.suspect],
                ["Evidence", stats.evidence, NODE_COLORS.evidence],
                ["Locations", stats.location, NODE_COLORS.location],
                ["Witnesses", stats.witness, NODE_COLORS.witness],
                ["Connections", stats.links, "hsl(var(--muted-foreground))"],
              ].map(([label, count, color]) => (
                <div key={label} className="flex items-center justify-between font-mono text-xs border-b border-white/5 pb-1 last:border-0">
                  <span className="text-muted-foreground uppercase text-[10px]">{label}</span>
                  <Badge variant="outline" className="text-[10px] border-none font-bold" style={{ color }}>{count}</Badge>
                </div>
              ))}
            </div>
            <Button onClick={exportPDF} variant="default" className="w-full h-10 text-[10px] font-bold tracking-[0.2em] mt-4 uppercase cyber-glow shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
              <Download className="h-3.5 w-3.5 mr-2" /> Export Case Dossier
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── small helpers moved or replaced by shadcn components ────────────────────────

