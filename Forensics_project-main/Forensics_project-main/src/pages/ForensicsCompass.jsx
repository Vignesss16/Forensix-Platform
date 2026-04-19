import { useState, useEffect, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import jsPDF from "jspdf";

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
    <div style={styles.root}>
      {/* ── header ── */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Forensics Compass</span>
        <span style={styles.headerSub}>Entity Relationship Mapper</span>
      </div>

      {/* ── toolbar ── */}
      <div style={styles.toolbar}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {["all", "suspect", "evidence", "location", "witness"].map((f) => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : NODE_LABELS[f] + "s"}
          </button>
        ))}
      </div>

      {/* ── graph ── */}
      <div style={styles.graphWrap}>
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
          height={360}
        />
      </div>

      {/* ── legend ── */}
      <div style={styles.legend}>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: color }} />
            <span>{NODE_LABELS[type]}</span>
          </div>
        ))}
        <span style={styles.hint}>Right-click a node to remove it</span>
      </div>

      {/* ── bottom panels ── */}
      <div style={styles.panelRow}>
        {/* add node */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Add Node</div>
          <FormRow label="Name">
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. John Doe"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNode()}
            />
          </FormRow>
          <FormRow label="Type">
            <select style={styles.input} value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              {Object.entries(NODE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Note">
            <input
              style={styles.input}
              type="text"
              placeholder="Optional detail"
              value={nodeNote}
              onChange={(e) => setNodeNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNode()}
            />
          </FormRow>
          <button style={styles.btn} onClick={addNode}>Add node</button>
        </div>

        {/* add link */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Add Link</div>
          <FormRow label="From">
            <select style={styles.input} value={linkFrom} onChange={(e) => setLinkFrom(e.target.value)}>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="To">
            <select style={styles.input} value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="Label">
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. witnessed"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
          </FormRow>
          <button style={styles.btn} onClick={addLink}>Add link</button>
        </div>

        {/* stats + export */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Case Stats</div>
          {[
            ["Suspects", stats.suspect, NODE_COLORS.suspect],
            ["Evidence", stats.evidence, NODE_COLORS.evidence],
            ["Locations", stats.location, NODE_COLORS.location],
            ["Witnesses", stats.witness, NODE_COLORS.witness],
            ["Connections", stats.links, "#888"],
          ].map(([label, count, color]) => (
            <div key={label} style={styles.statRow}>
              <span style={styles.statLabel}>{label}</span>
              <span style={{ ...styles.statValue, color }}>{count}</span>
            </div>
          ))}
          <button style={{ ...styles.btn, ...styles.exportBtn }} onClick={exportPDF}>
            Export PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── small helpers ──────────────────────────────────────────────────────────────
function FormRow({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "#888", width: 42, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 0 24px",
  },
  header: {
    background: "#1a1a1a",
    padding: "14px 20px",
    borderRadius: "10px 10px 0 0",
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" },
  headerSub: { color: "#888", fontSize: 12 },
  toolbar: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  searchInput: { fontSize: 13, padding: "5px 10px", borderRadius: 6, border: "1px solid #ddd", flex: "0 0 180px" },
  filterBtn: {
    fontSize: 12, padding: "5px 10px", borderRadius: 99,
    border: "1px solid #ddd", background: "#fff", cursor: "pointer", color: "#666",
  },
  filterBtnActive: { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" },
  graphWrap: {
    border: "1px solid #e5e5e5", borderRadius: 10,
    background: "#fafafa", overflow: "hidden", marginBottom: 10,
  },
  legend: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#666" },
  legendDot: { width: 10, height: 10, borderRadius: "50%" },
  hint: { marginLeft: "auto", fontSize: 11, color: "#aaa" },
  panelRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  panel: {
    flex: 1, minWidth: 200,
    background: "#fff", border: "1px solid #e5e5e5",
    borderRadius: 10, padding: "14px 16px",
  },
  panelTitle: { fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 },
  input: { flex: 1, fontSize: 13, padding: "4px 8px", borderRadius: 5, border: "1px solid #ddd", width: "100%" },
  btn: {
    width: "100%", marginTop: 6, fontSize: 13, padding: "7px 0",
    borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer",
  },
  exportBtn: { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a", marginTop: 12 },
  statRow: { display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 },
  statLabel: { color: "#888" },
  statValue: { fontWeight: 600 },
};
