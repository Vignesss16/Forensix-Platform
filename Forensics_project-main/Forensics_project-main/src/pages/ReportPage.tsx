import { useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import { FileText, Download, Loader2, AlertTriangle, Globe, Wallet, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function ReportPage() {
  const { data, suspiciousItems, foreignNumbers, cryptoWallets } = useInvestigation();
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);

  // same decryption logic we added at parse time; here it protects the export
  // routines in case the data was loaded before parsing was updated or
  // exhibits encrypted fragments.
  const decryptText = (s: any) => (typeof s === "string" ? s.replace(/&/g, "") : s);

  // if (!data) return <Navigate to="/" replace />;


  const exportJSON = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary,
      statistics: {
        totalChats: data.chats.length,
        totalCalls: data.calls.length,
        totalContacts: data.contacts.length,
        totalImages: data.images.length,
        suspiciousItems: suspiciousItems.length,
        foreignNumbers: foreignNumbers.length,
        cryptoWallets: cryptoWallets.length,
      },
      suspiciousMessages: suspiciousItems.map(item => ({
        ...item.record,
        reason: item.reason,
        severity: item.severity,
      })).map(msg => ({
        ...msg,
        from: decryptText(msg.from),
        to: decryptText(msg.to),
        message: decryptText((msg as any).message),
      })),
      foreignNumbers: foreignNumbers.map(decryptText),
      cryptoWallets: cryptoWallets.map(decryptText),
    };

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2)));
    element.setAttribute("download", `chanakya_report_${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("JSON report exported");
  };

  const exportCSV = () => {
    const csvContent = [
      ["Type", "From", "To", "Message/Metadata", "Timestamp", "Reason/Device"],
      ...suspiciousItems.map(item => {
        const c = item.record as any;
        return ["Suspicious Message", c.from, c.to, c.message, c.timestamp, item.reason];
      }),
      ...foreignNumbers.map(num => ["Foreign Number", num, "", "", "", ""]),
      ...cryptoWallets.map(w => ["Crypto Wallet", w, "", "", "", ""]),
      ...data.contacts.map(c => ["Contact", c.name, c.phone, c.organization || "", "", ""])
    ]
      .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `chanakya_full_report_${Date.now()}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("CSV report exported");
  };

  const exportHTML = () => {
    const caseTitle = data?.caseTitle || "UNNAMED_OPERATION";
    const caseId = data?.caseId || "N/A";
    const daysElapsed = data?.createdAt ? Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CHANAKYA | Intelligence Report | ${caseTitle}</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Inter:wght@400;600;900&display=swap" rel="stylesheet">
    <style>
        :root { 
            --primary: #06b6d4; 
            --bg: #020617; 
            --card: #0f172a; 
            --border: rgba(6, 182, 212, 0.2);
            --text: #f1f5f9;
            --muted: #94a3b8;
            --crimson: #ef4444;
            --amber: #f59e0b;
        }
        * { box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 40px; 
            background: var(--bg); 
            color: var(--text);
            line-height: 1.5;
        }
        .watermark { 
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-35deg); 
            font-size: 140px; 
            color: rgba(6, 182, 212, 0.05); 
            font-weight: 900; 
            z-index: -1; 
            pointer-events: none; 
            white-space: nowrap; 
            font-family: 'Inter', sans-serif;
            letter-spacing: 20px;
        }
        .page { 
            max-width: 900px; 
            margin: 0 auto; 
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 50px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            position: relative;
            overflow: hidden;
        }
        .page::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, var(--primary), transparent);
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 50px;
            padding-bottom: 30px;
            border-bottom: 1px solid var(--border);
        }
        .logo-section h1 { 
            font-family: 'JetBrains Mono', monospace; 
            font-size: 32px; 
            margin: 0; 
            letter-spacing: 6px; 
            color: var(--primary);
            font-weight: 800;
        }
        .logo-section p { 
            font-size: 10px; 
            text-transform: uppercase; 
            letter-spacing: 3px; 
            color: var(--muted); 
            margin: 8px 0 0 0; 
            font-weight: 600;
        }
        .meta-table { 
            font-family: 'JetBrains Mono', monospace; 
            font-size: 10px; 
            text-align: right; 
            color: var(--muted);
        }
        .meta-table td { padding: 2px 0 2px 20px; }
        .meta-val { color: var(--primary); font-weight: 700; }

        .doc-title { 
            text-align: center; 
            margin: 40px 0; 
        }
        .doc-title h2 {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin: 0;
            color: var(--text);
        }
        .doc-title .case-name {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 15px;
            background: rgba(6, 182, 212, 0.1);
            border: 1px solid var(--border);
            color: var(--primary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            border-radius: 4px;
        }

        .section { margin-bottom: 50px; }
        .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
        }
        .section-header h3 {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--primary);
            margin: 0;
        }
        .section-header .line {
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .summary-box {
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 20px;
            font-size: 14px;
            border-left: 3px solid var(--primary);
            white-space: pre-wrap;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        .stat-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-val { font-size: 24px; font-weight: 800; color: var(--primary); font-family: 'JetBrains Mono', monospace; }
        .stat-lab { font-size: 9px; text-transform: uppercase; color: var(--muted); margin-top: 5px; letter-spacing: 1px; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { 
            text-align: left; 
            font-size: 10px; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            color: var(--muted);
            padding: 15px 10px;
            border-bottom: 1px solid var(--border);
        }
        td { padding: 15px 10px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        
        .severity {
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            font-family: 'JetBrains Mono', monospace;
        }
        .sev-high { background: rgba(239, 68, 68, 0.15); color: var(--crimson); border: 1px solid rgba(239, 68, 68, 0.3); }
        .sev-medium { background: rgba(245, 158, 11, 0.15); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.3); }
        .sev-low { background: rgba(6, 182, 212, 0.15); color: var(--primary); border: 1px solid var(--border); }

        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            font-family: 'JetBrains Mono', monospace;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        @media print {
            body { padding: 0; background: white; color: black; }
            .page { box-shadow: none; border: 1px solid #ddd; max-width: 100%; }
            .watermark { color: rgba(0,0,0,0.05); }
        }
    </style>
</head>
<body>
    <div class="watermark">SECRET</div>
    <div class="page">
        <header class="header">
            <div class="logo-section">
                <h1>CHANAKYA</h1>
                <p>Digital Forensics & Intelligence Intelligence</p>
            </div>
            <table class="meta-table">
                <tr><td>REPORT NO:</td><td class="meta-val">FR-${Math.floor(Date.now()/100000)}</td></tr>
                <tr><td>DATE:</td><td class="meta-val">${new Date().toLocaleDateString('en-IN')}</td></tr>
                <tr><td>OP DURATION:</td><td class="meta-val">${daysElapsed} DAYS ELAPSED</td></tr>
                <tr><td>CLASSIFICATION:</td><td class="meta-val">TOP SECRET // NOFORN</td></tr>
            </table>
        </header>

        <div class="doc-title">
            <h2>Forensic Investigation Summary</h2>
            <div class="case-name">${caseTitle} // ID: ${caseId}</div>
        </div>

        <section class="section">
            <div class="section-header">
                <h3>Executive Summary</h3>
                <div class="line"></div>
            </div>
            <div class="summary-box">${summary || "Investigation summary pending officer entry."}</div>
        </section>

        <section class="section">
            <div class="section-header">
                <h3>Operational Intelligence Metrics</h3>
                <div class="line"></div>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-val">${data.chats.length}</div><div class="stat-lab">Processed Msgs</div></div>
                <div class="stat-card"><div class="stat-val">${suspiciousItems.length}</div><div class="stat-lab">Threats Identified</div></div>
                <div class="stat-card"><div class="stat-val">${foreignNumbers.length}</div><div class="stat-lab">Foreign Nodes</div></div>
                <div class="stat-card"><div class="stat-val">${cryptoWallets.length}</div><div class="stat-lab">Financial Links</div></div>
            </div>
        </section>

        ${suspiciousItems.length > 0 ? `
        <section class="section">
            <div class="section-header">
                <h3>High-Value Targets & Red Flags</h3>
                <div class="line"></div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th width="15%">Level</th>
                        <th width="25%">Source Entity</th>
                        <th>Evidence Narrative / Forensic Proof</th>
                    </tr>
                </thead>
                <tbody>
                    ${suspiciousItems.map(item => `
                    <tr>
                        <td><span class="severity sev-${item.severity.toLowerCase()}">${item.severity}</span></td>
                        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${decryptText((item.record as any).from)}</td>
                        <td>
                            <div style="margin-bottom: 5px; font-style: italic;">"${decryptText((item.record as any).message)}"</div>
                            <div style="font-size: 10px; color: var(--muted); font-weight: 600;">ANALYST NOTE: ${item.reason}</div>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </section>
        ` : ''}

        <footer class="footer">
            <div>Chanakya Forensics v1.0.4 // Cryptographic Sign Verification Pending</div>
            <div>Generated by Officer ID: ${caseId.slice(0, 8)}</div>
            <div>Page 01 // EOF</div>
        </footer>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.setAttribute("href", url);
    element.setAttribute("download", `chanakya_professional_report_${Date.now()}.html`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Professional report exported");
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      let y = 20;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const caseId = data?.caseId || "N/A";
      const caseTitle = data?.caseTitle || "UNNAMED_OPERATION";

      // Professional Colors
      const colorNavy = [2, 6, 23]; // hsl(222, 47%, 5%)
      const colorCyan = [0, 255, 242]; // Primary
      const colorMuted = [100, 116, 139]; // Muted text
      const colorCrimson = [220, 38, 38]; // High severity

      const addWatermark = () => {
        doc.saveGraphicsState();
        doc.setTextColor(240, 240, 240);
        doc.setFontSize(120);
        doc.setFont("helvetica", "bold");
        doc.text("SECRET", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 45,
        });
        doc.restoreGraphicsState();
      };

      const addHeader = (pageNum: number) => {
        // Dark Top Header
        doc.setFillColor(colorNavy[0], colorNavy[1], colorNavy[2]);
        doc.rect(0, 0, pageWidth, 40, "F");
        
        // Bottom Accent Line
        doc.setFillColor(colorCyan[0], colorCyan[1], colorCyan[2]);
        doc.rect(0, 38, pageWidth, 2, "F");

        // Branding
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("CHANAKYA", margin, 22);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colorCyan[0], colorCyan[1], colorCyan[2]);
        doc.text("DIGITAL FORENSICS PLATFORM // OPERATIONAL INTELLIGENCE", margin, 28);

        // Metadata on right
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`REPORT ID: ${caseId.slice(0, 12).toUpperCase()}`, pageWidth - margin, 18, { align: "right" });
        doc.text(`CLASSIFICATION: TOP SECRET`, pageWidth - margin, 23, { align: "right" });
        doc.text(`DATE: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, 28, { align: "right" });
      };

      const addFooter = (pageNum: number) => {
        doc.setFillColor(colorNavy[0], colorNavy[1], colorNavy[2]);
        doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text(`© 2026 CHANAKYA FORENSICS ENGINE // SYSTEM VERIFIED`, margin, pageHeight - 6);
        doc.text(`PAGE ${pageNum}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      };

      const checkNewPage = (needed: number) => {
        if (y + needed > pageHeight - 25) {
          addFooter(doc.internal.getNumberOfPages());
          doc.addPage();
          addWatermark();
          addHeader(doc.internal.getNumberOfPages());
          y = 55;
          return true;
        }
        return false;
      };

      // Start first page
      addWatermark();
      addHeader(1);
      y = 60;

      // Executive Summary
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("I. EXECUTIVE SUMMARY", margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      const summaryText = summary || "No officer summary provided for this dossier. Intelligence extraction performed automatically.";
      const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
      doc.text(splitSummary, margin, y);
      y += splitSummary.length * 6 + 10;

      // Intelligence Metrics Grid
      checkNewPage(40);
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y, contentWidth, 25, "F");
      
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      const colWidth = contentWidth / 4;
      doc.text("TOTAL CHATS", margin + 10, y + 8);
      doc.text("FLAGGED ITEMS", margin + colWidth + 10, y + 8);
      doc.text("FOREIGN ASSETS", margin + colWidth * 2 + 10, y + 8);
      doc.text("CRYPTO NODES", margin + colWidth * 3 + 10, y + 8);
      
      doc.setFontSize(14);
      doc.setTextColor(colorCyan[0], colorCyan[1], colorCyan[2]);
      // Use dark cyan for better visibility on light gray
      doc.setTextColor(0, 150, 140);
      doc.text(data.chats.length.toString(), margin + 10, y + 18);
      doc.text(suspiciousItems.length.toString(), margin + colWidth + 10, y + 18);
      doc.text(foreignNumbers.length.toString(), margin + colWidth * 2 + 18, y + 18);
      doc.text(cryptoWallets.length.toString(), margin + colWidth * 3 + 18, y + 18);
      
      y += 35;

      // Flagged Messages
      if (suspiciousItems.length > 0) {
        checkNewPage(20);
        doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("II. TARGETED INTELLIGENCE (FLAGGED)", margin, y);
        y += 8;

        suspiciousItems.slice(0, 20).forEach((item, idx) => {
          checkNewPage(30);
          const c = item.record as any;
          
          doc.setFillColor(252, 252, 254);
          doc.rect(margin, y, contentWidth, 22, "F");
          doc.setDrawColor(230, 230, 235);
          doc.rect(margin, y, contentWidth, 22, "S");
          
          // Severity Marker
          const sColor = item.severity === 'high' ? [220, 38, 38] : [245, 158, 11];
          doc.setFillColor(sColor[0], sColor[1], sColor[2]);
          doc.rect(margin, y, 4, 22, "F");
          
          doc.setTextColor(sColor[0], sColor[1], sColor[2]);
          doc.setFontSize(7);
          doc.text(item.severity.toUpperCase(), margin + 8, y + 6);
          
          doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`${decryptText(c.from)} → ${decryptText(c.to)}`, margin + 8, y + 11);
          
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          const msgText = `"${decryptText(c.message)}"`;
          const splitMsg = doc.splitTextToSize(msgText, contentWidth - 20);
          doc.text(splitMsg[0], margin + 8, y + 16);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
          doc.text(`REASON: ${item.reason}`, margin + 8, y + 20);
          
          y += 26;
        });
        y += 5;
      }

      // Foreign Numbers
      if (foreignNumbers.length > 0) {
        checkNewPage(30);
        doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("III. FOREIGN ASSET LIST", margin, y);
        y += 8;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        foreignNumbers.forEach((num, i) => {
          checkNewPage(8);
          doc.text(`• ${num}`, margin + 5, y);
          y += 6;
        });
        y += 10;
      }

      // Crypto Wallets
      if (cryptoWallets.length > 0) {
        checkNewPage(30);
        doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("IV. CRYPTOCURRENCY NODES", margin, y);
        y += 8;
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        cryptoWallets.forEach((w, i) => {
          checkNewPage(8);
          doc.text(`• ${w}`, margin + 5, y);
          y += 6;
        });
        y += 10;
      }

      // Final Footer
      addFooter(doc.internal.getNumberOfPages());

      doc.save(`CHANAKYA_REPORT_${caseId.slice(0, 8).toUpperCase()}_${Date.now()}.pdf`);
      toast.success("Professional Forensic Report generated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="bg-card/50 p-12 rounded-2xl border border-dashed border-border max-w-md w-full">
          <FileText className="h-16 w-16 text-primary/20 mx-auto mb-6" />
          <h2 className="text-xl font-mono text-primary/80 mb-2">No active case selected</h2>
          <p className="text-sm text-muted-foreground mb-8 text-pretty">
            You must select an investigation case from the dashboard before a forensic report can be generated.
          </p>
          <Button onClick={() => window.location.href='/cases'} variant="outline" className="w-full font-mono">
            Go to Case Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ... rest of the existing return ... */}

      <div>
        <h1 className="text-xl md:text-2xl font-black font-mono tracking-[0.2em] text-primary cyber-text-glow flex items-center gap-3 uppercase">
          <FileText className="h-6 w-6" />
          Forensic Report
        </h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60 font-mono">
          Create professional downloadable investigation reports with all intelligence artifacts
        </p>
      </div>

      {/* Report Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-lg cyber-border p-5 space-y-3">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Report Contents</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {data.chats.length} chat messages</div>
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> {suspiciousItems.length} flagged items</div>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-warning" /> {foreignNumbers.length} foreign numbers</div>
            <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" /> {cryptoWallets.length} crypto wallets</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-lg cyber-border p-5">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">Investigation Summary</h3>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Enter your investigation summary and key findings..."
            className="bg-secondary border-border min-h-[120px] font-mono text-sm"
          />
        </motion.div>
      </div>

      <Button onClick={generatePDF} disabled={generating} className="w-full font-mono gap-2" size="lg">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {generating ? "Generating Report..." : "Download PDF Report"}
      </Button>

      {/* Export Options */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => exportJSON()}
          variant="outline"
          className="font-mono gap-2"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
        <Button
          onClick={() => exportCSV()}
          variant="outline"
          className="font-mono gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={exportHTML}
          variant="outline"
          className="font-mono gap-2"
        >
          <Download className="h-4 w-4" />
          Export HTML
        </Button>
      </div>

      {/* Preview of flagged items */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-lg cyber-border p-5">
        <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">Report Preview — Flagged Messages</h3>
        <div className="space-y-2 max-h-64 overflow-auto">
          {suspiciousItems.slice(0, 8).map((item, i) => {
            const c = item.record as any;
            return (
              <div key={i} className="bg-secondary rounded p-3 text-sm border-l-2 border-destructive/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{c.from} → {c.to}</span>
                  <Badge variant="destructive" className="text-[10px] h-4">{item.severity}</Badge>
                </div>
                <p className="text-foreground/80">{c.message}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
