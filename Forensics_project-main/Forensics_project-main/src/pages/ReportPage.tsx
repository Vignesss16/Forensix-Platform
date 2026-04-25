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
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CHANAKYA Intelligence Report - Confidential</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #2563eb; --border: #e5e7eb; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1f2937; line-height: 1.6; background: #f9fafb; position: relative; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0,0,0,0.03); font-weight: 900; z-index: -1; pointer-events: none; white-space: nowrap; font-family: sans-serif; }
        .page { background: white; max-width: 850px; margin: 0 auto; padding: 60px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 8px; border: 1px solid var(--border); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 25px; margin-bottom: 40px; }
        .logo-section h1 { font-family: 'JetBrains Mono', monospace; font-size: 28px; margin: 0; letter-spacing: 4px; color: #111; }
        .logo-section p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 5px 0 0 0; }
        .meta-section { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #444; }
        .doc-title { text-align: center; font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 40px 0; letter-spacing: 2px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; }
        .section { margin-bottom: 45px; }
        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111; border-left: 4px solid var(--primary); padding-left: 12px; margin-bottom: 20px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-card { border: 1px solid #eee; padding: 15px; border-radius: 6px; }
        .stat-val { font-size: 18px; font-weight: 700; color: var(--primary); }
        .stat-lab { font-size: 10px; text-transform: uppercase; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; background: #f8fafc; border-bottom: 2px solid #eee; padding: 12px 8px; text-transform: uppercase; font-size: 10px; }
        td { border-bottom: 1px solid #f1f5f9; padding: 12px 8px; vertical-align: top; }
        .severity-high { color: #ef4444; font-weight: 700; }
        .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
        @media print { body { background: white; padding: 0; } .page { box-shadow: none; border: none; max-width: 100%; } }
    </style>
</head>
<body>
    <div class="watermark">CONFIDENTIAL</div>
    <div class="page">
        <div class="header">
            <div class="logo-section">
                <h1>CHANAKYA</h1>
                <p>Digital Forensics & Intelligence Platform</p>
            </div>
            <div class="meta-section">
                REPORT ID: FR-${Math.floor(Math.random() * 1000000)}<br>
                DATE: ${new Date().toLocaleDateString('en-IN')}<br>
                CLASSIFICATION: SECRET
            </div>
        </div>

        <div class="doc-title">Forensic Investigation Report</div>

        <div class="section">
            <div class="section-title">Case Summary</div>
            <p style="white-space: pre-wrap; font-size: 13px;">${summary || "No executive summary provided."}</p>
        </div>

        <div class="section">
            <div class="section-title">Evidence Metadata Statistics</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                <div class="stat-card"><div class="stat-val">${data.chats.length}</div><div class="stat-lab">Messages</div></div>
                <div class="stat-card"><div class="stat-val">${data.calls.length}</div><div class="stat-lab">Calls</div></div>
                <div class="stat-card"><div class="stat-val">${suspiciousItems.length}</div><div class="stat-lab">Threats</div></div>
                <div class="stat-card"><div class="stat-val">${cryptoWallets.length}</div><div class="stat-lab">Wallets</div></div>
            </div>
        </div>

        ${suspiciousItems.length > 0 ? `
        <div class="section">
            <div class="section-title">High-Value Clues & Red Flags</div>
            <table>
                <thead>
                    <tr>
                        <th width="15%">Severity</th>
                        <th width="30%">Entity</th>
                        <th>Evidence / Proof Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${suspiciousItems.map(item => `
                    <tr>
                        <td class="severity-${item.severity.toLowerCase()}">${item.severity.toUpperCase()}</td>
                        <td style="font-family: monospace;">${decryptText((item.record as any).from)}</td>
                        <td>
                            <strong>Proof:</strong> "${decryptText((item.record as any).message)}"<br>
                            <span style="font-size: 10px; color: #666;">Reason: ${item.reason}</span>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            <div>Chanakya Forensic Intelligence System</div>
            <div>Generated by Officer ID: SYSTEM_AUTO</div>
            <div>Page 1 of 1</div>
        </div>
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
      const lineHeight = 7;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;

      const addLine = (text: string, fontSize = 10, isBold = false) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, pageWidth);
        doc.text(lines, margin, y);
        y += lines.length * lineHeight;
      };

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CHANAKYA — Investigation Report", margin, y);
      y += 12;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toISOString()}`, margin, y);
      y += 15;

      // Summary
      addLine("INVESTIGATION SUMMARY", 14, true);
      y += 3;
      addLine(summary || "No summary provided by investigator.", 10);
      y += 10;

      // Stats
      addLine("DATA OVERVIEW", 14, true);
      y += 3;
      addLine(`Total Records: ${data.rawRecords.length}`);
      addLine(`Chats: ${data.chats.length} | Calls: ${data.calls.length} | Contacts: ${data.contacts.length} | Images: ${data.images.length}`);
      addLine(`Suspicious Items: ${suspiciousItems.length}`);
      addLine(`Foreign Numbers: ${foreignNumbers.length}`);
      addLine(`Crypto Wallets: ${cryptoWallets.length}`);
      y += 10;

      // Suspicious chats
      if (suspiciousItems.length > 0) {
        addLine("FLAGGED MESSAGES", 14, true);
        y += 3;
        suspiciousItems.slice(0, 15).forEach((item, i) => {
          const c = item.record as any;
          addLine(
            `${i + 1}. [${item.severity.toUpperCase()}] ${decryptText(c.from)} → ${decryptText(c.to)}`,
            10,
            true
          );
          addLine(`   "${decryptText(c.message)}"`);
          addLine(`   Reason: ${item.reason}`);
          y += 3;
        });
        y += 7;
      }

      // Foreign numbers
      if (foreignNumbers.length > 0) {
        addLine("FOREIGN NUMBERS", 14, true);
        y += 3;
        foreignNumbers.forEach(num => addLine(`  • ${num}`));
        y += 7;
      }

      // Crypto wallets
      if (cryptoWallets.length > 0) {
        addLine("CRYPTO WALLET ADDRESSES", 14, true);
        y += 3;
        cryptoWallets.forEach(w => addLine(`  • ${w}`));
        y += 7;
      }

      // Key contacts
      addLine("KEY CONTACTS", 14, true);
      y += 3;
      data.contacts.forEach(c => {
        addLine(`  • ${c.name} — ${c.phone}${c.organization ? ` (${c.organization})` : ""}`);
      });

      doc.save("forensix-investigation-report.pdf");
      toast.success("Report downloaded successfully");
    } catch (e) {
      toast.error("Failed to generate report");
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
        <h1 className="text-2xl font-bold font-mono text-primary cyber-text-glow flex items-center gap-2">
          <FileText className="h-6 w-6" /> Generate Report
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Create a downloadable PDF investigation report</p>
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
