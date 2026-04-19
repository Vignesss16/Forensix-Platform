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

  if (!data) return <Navigate to="/" replace />;

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
    element.setAttribute("download", `forensix_report_${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("JSON report exported");
  };

  const exportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FORENSIX Investigation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .timestamp { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; }
        .stats { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .stat-item { display: inline-block; margin-right: 20px; margin-bottom: 10px; }
        .suspicious-item { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
        .severity-high { border-left-color: #ef4444; }
        .severity-medium { border-left-color: #f59e0b; }
        .severity-low { border-left-color: #10b981; }
        .crypto-wallet { background: #f0f9ff; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-family: monospace; }
        .foreign-number { background: #f3f4f6; padding: 8px; margin-bottom: 8px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">FORENSIX Digital Forensics Report</div>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </div>

    ${summary ? `
    <div class="section">
        <div class="section-title">Executive Summary</div>
        <p>${summary.replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Investigation Statistics</div>
        <div class="stats">
            <div class="stat-item"><strong>Total Records:</strong> ${data.rawRecords.length}</div>
            <div class="stat-item"><strong>Chats:</strong> ${data.chats.length}</div>
            <div class="stat-item"><strong>Calls:</strong> ${data.calls.length}</div>
            <div class="stat-item"><strong>Contacts:</strong> ${data.contacts.length}</div>
            <div class="stat-item"><strong>Images:</strong> ${data.images.length}</div>
            <div class="stat-item"><strong>Suspicious Items:</strong> ${suspiciousItems.length}</div>
            <div class="stat-item"><strong>Foreign Numbers:</strong> ${foreignNumbers.length}</div>
            <div class="stat-item"><strong>Crypto Wallets:</strong> ${cryptoWallets.length}</div>
        </div>
    </div>

    ${suspiciousItems.length > 0 ? `
    <div class="section">
        <div class="section-title">Flagged Messages</div>
        ${suspiciousItems.map(item => {
            const chat = item.record as any;
            return `
            <div class="suspicious-item severity-${item.severity}">
                <strong>${decryptText(chat.from)} → ${decryptText(chat.to)}</strong><br>
                <em>${decryptText(chat.message)}</em><br>
                <small>Reason: ${item.reason} | Severity: ${item.severity.toUpperCase()}</small>
            </div>
            `;
        }).join('')}
    </div>
    ` : ''}

    ${foreignNumbers.length > 0 ? `
    <div class="section">
        <div class="section-title">Foreign Numbers Detected</div>
        ${foreignNumbers.map(number => `<div class="foreign-number">${decryptText(number)}</div>`).join('')}
    </div>
    ` : ''}

    ${cryptoWallets.length > 0 ? `
    <div class="section">
        <div class="section-title">Cryptocurrency Wallets Detected</div>
        ${cryptoWallets.map(wallet => `<div class="crypto-wallet">${decryptText(wallet)}</div>`).join('')}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Report Footer</div>
        <p><em>This report was generated by FORENSIX Digital Forensics Platform</em></p>
    </div>
</body>
</html>`;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
    element.setAttribute("download", `forensix-report-${Date.now()}.html`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("HTML report exported successfully");
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
      doc.text("FORENSIX — Investigation Report", margin, y);
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
