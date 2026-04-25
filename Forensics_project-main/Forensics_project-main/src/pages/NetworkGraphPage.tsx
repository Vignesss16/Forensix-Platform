import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { CRYPTO_WALLET_PATTERNS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Node {
  id: string;
  label: string;
  type: string;
  val: number;
  x?: number;
  y?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  label: string;
  count?: number;
}

export default function NetworkGraphPage() {
  const { data } = useInvestigation();
  const graphRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPerson, setShowPerson] = useState(true);
  const [showWallet, setShowWallet] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [deferredData, setDeferredData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });

  // ── Processing Engine ───────────────────────────────────────────────────────
  // Defer processing to prevent UI lockup on page mount
  useEffect(() => {
    if (!data) return;
    
    setIsProcessing(true);
    
    // Small timeout to allow navigation animation to finish and yield to main thread
    const timer = setTimeout(() => {
      const nodesMap = new Map<string, Node>();
      const linksMap = new Map<string, Link>();
      const contactPhones = new Set<string>();

      function addNode(id: string, label: string, type: string) {
        if (!nodesMap.has(id)) {
          nodesMap.set(id, { id, label, type, val: 1 });
        } else {
          const node = nodesMap.get(id)!;
          node.val += 1;
        }
      }

      function addLink(source: string, target: string, label: string) {
        const key = `${source}-${target}-${label}`;
        const rev = `${target}-${source}-${label}`;
        if (linksMap.has(key)) {
          (linksMap.get(key) as any).count += 1;
        } else if (linksMap.has(rev)) {
          (linksMap.get(rev) as any).count += 1;
        } else {
          linksMap.set(key, { source, target, label, count: 1 } as any);
        }
      }

      // Add contacts
      data.contacts.forEach(c => {
        addNode(c.phone, c.name || c.phone, "person");
        contactPhones.add(c.phone);
      });

      // Process chats
      data.chats.forEach(c => {
        if (dateRange.start && new Date(c.timestamp) < new Date(dateRange.start)) return;
        if (dateRange.end && new Date(c.timestamp) > new Date(dateRange.end)) return;

        addNode(c.from, c.from, contactPhones.has(c.from) ? "person" : "phone");
        addNode(c.to, c.to, contactPhones.has(c.to) ? "person" : "phone");
        addLink(c.from, c.to, "chat");

        CRYPTO_WALLET_PATTERNS.forEach(p => {
          const matches = c.message.match(p);
          if (matches) {
            matches.forEach(w => {
              const wId = `wallet:${w.slice(0, 10)}`;
              addNode(wId, w.slice(0, 12) + "...", "wallet");
              addLink(c.from, wId, "wallet");
            });
          }
        });
      });

      // Process calls
      data.calls.forEach(c => {
        if (dateRange.start && new Date(c.timestamp) < new Date(dateRange.start)) return;
        if (dateRange.end && new Date(c.timestamp) > new Date(dateRange.end)) return;

        addNode(c.from, c.from, contactPhones.has(c.from) ? "person" : "phone");
        addNode(c.to, c.to, contactPhones.has(c.to) ? "person" : "phone");
        addLink(c.from, c.to, "call");
      });

      // Update names
      data.contacts.forEach(c => {
        if (nodesMap.has(c.phone)) {
          nodesMap.get(c.phone)!.label = c.name || c.phone;
        }
      });

      setDeferredData({
        nodes: Array.from(nodesMap.values()),
        links: Array.from(linksMap.values())
      });
      setIsProcessing(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [data, dateRange]);

  // Track container size
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const filteredData = useMemo(() => {
    const filteredNodes = deferredData.nodes.filter(n => {
      if (n.type === "person" && !showPerson) return false;
      if (n.type === "wallet" && !showWallet) return false;
      if (n.type === "phone" && !showPhone) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = deferredData.links.filter(l => {
      const sourceId = typeof l.source === "string" ? l.source : (l.source as Node).id;
      const targetId = typeof l.target === "string" ? l.target : (l.target as Node).id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [deferredData, showPerson, showWallet, showPhone]);

  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case "person": return "hsl(185, 80%, 50%)";
      case "wallet": return "hsl(160, 70%, 45%)";
      case "phone":  return "hsl(215, 15%, 50%)";
      default:       return "hsl(215, 15%, 50%)";
    }
  }, []);

  const linkColor = useCallback((link: Link) => {
    return link.label === "wallet" ? "hsl(160, 70%, 45%)" : "hsl(220, 20%, 25%)";
  }, []);

  // Set custom forces for the graph to prevent the big green blob
  useEffect(() => {
    if (graphRef.current) {
      // Increase repulsion between nodes significantly
      graphRef.current.d3Force("charge").strength(-400);
      graphRef.current.d3Force("link").distance(80);
      // Center the graph
      graphRef.current.d3Force("center").x(0).y(0);
    }
  }, [filteredData]);

  // We allow rendering without investigation data now to prevent navigation loops
  // if (!data) return <Navigate to="/" replace />;


  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold font-mono text-primary cyber-text-glow flex items-center gap-2">
            <Network className="h-5 w-5" /> Link Analysis
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredData.nodes.length} entities · {filteredData.links.length} connections
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-2">
          <Badge variant="outline" className="font-mono text-[10px] border-cyan-400 text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block mr-1" /> Person
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] border-teal-400 text-teal-300">
            <span className="h-2 w-2 rounded-full bg-teal-400 inline-block mr-1" /> Wallet
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] border-gray-400 text-gray-300">
            <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1" /> Phone
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showPerson} onCheckedChange={(v) => setShowPerson(!!v)} />
            <span className="font-mono">Show Persons</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showWallet} onCheckedChange={(v) => setShowWallet(!!v)} />
            <span className="font-mono">Show Wallets</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showPhone} onCheckedChange={(v) => setShowPhone(!!v)} />
            <span className="font-mono">Show Phones</span>
          </label>
        </div>

        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: "", end: "" })}
              className="px-2 py-1 text-xs rounded border border-border hover:border-primary text-muted-foreground hover:text-primary"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Graph — fills remaining space */}
      <div className="flex-1 bg-background overflow-hidden relative" ref={containerRef}>
        {!data ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-[#06080d] z-10 space-y-8">
            <div className="relative text-center">
              <div className="relative mb-6 mx-auto w-fit">
                <Network className="h-16 w-16 text-primary/20 animate-pulse" />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/20 rounded-full blur-sm" />
              </div>
              <p className="text-lg font-mono text-primary/60 cyber-text-glow">Link Analysis Engine Standby</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
                Select an active case or load sample evidence to generate the relationship graph.
              </p>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => (window.location.href='/upload')} variant="default" className="font-mono px-8">
                Upload UFDR
              </Button>
              <Button onClick={() => (window.location.href='/upload')} variant="outline" className="font-mono px-8">
                Load Sample
              </Button>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-[#06080d]/80 z-20 space-y-6 backdrop-blur-sm">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-2 rounded-full border border-primary/10 border-b-primary/50 animate-spin [animation-duration:3s]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Network className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono text-primary cyber-text-glow animate-pulse">Analyzing Intelligence Relationships</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-[0.2em]">Processing nodes and links...</p>
            </div>
            {/* Scanner line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] animate-scanline" />
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={filteredData}
            width={dimensions.width}
            height={dimensions.height}
            nodeColor={nodeColor}
            nodeLabel={(node: Node) => `${node.label} (${node.type})`}
            nodeRelSize={6}
            nodeVal={(node: Node) => Math.max(node.val * 1.5, 3)}
            linkColor={linkColor}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkLabel={(link: Link) => `${link.label} (${link.count || 1})`}
            backgroundColor="hsl(220, 25%, 6%)"
            nodeCanvasObjectMode={() => "after"}
            onNodeClick={(node: Node) => setSelectedNode(node)}
            cooldownTicks={100}
            minZoom={0.5}
            maxZoom={10}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
            nodeCanvasObject={(node: Node, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.label || node.id;
              // Only render labels at reasonable zoom levels to save performance
              if (globalScale < 0.8) return;
              
              const fontSize = Math.max(12 / globalScale, 1.5);
              ctx.font = `${fontSize}px JetBrains Mono, monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "hsl(50, 100%, 75%)";
              ctx.fillText(label.length > 14 ? label.slice(0, 14) + ".." : label, node.x!, node.y! + 7);
            }}
          />
        )}
      </div>


      {/* Node Details Modal */}
      {selectedNode && (
        <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono">{selectedNode.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID</p>
                  <p className="text-sm font-mono break-all">{selectedNode.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <Badge className="w-fit">{selectedNode.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Connections</p>
                  <p className="text-sm font-mono">{selectedNode.val}</p>
                </div>
              </div>

              {selectedNode.type !== "wallet" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Related Messages</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.chats
                      .filter(c => c.from === selectedNode.id || c.to === selectedNode.id)
                      .slice(0, 10)
                      .map((chat, i) => (
                        <div key={i} className="bg-secondary rounded p-2 text-xs">
                          <p className="text-muted-foreground mb-1">
                            {chat.from} → {chat.to}
                          </p>
                          <p className="text-foreground break-words">{chat.message.slice(0, 100)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(chat.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
