import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileJson, FileCode, Database, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { parseUploadedFile, generateSampleData } from "@/lib/parser";
import { toast } from "sonner";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setData } = useInvestigation();
  const navigate = useNavigate();

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const content = await file.text();
      const parsed = parseUploadedFile(content, file.name);
      if (parsed.rawRecords.length === 0) {
        toast.error("No forensic records found in the file");
        return;
      }
      setData(parsed);

      // Save to MongoDB
      try {
        const token = localStorage.getItem('forensix_token');
        if (token) {
          await fetch('http://localhost:5000/api/uploads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              filename:   file.name,
              parsedData: parsed,
            }),
          });
        }
      } catch (uploadErr) {
        console.error('Failed to save upload to DB:', uploadErr);
        // Don't block user — just log it
      }

      toast.success(`Loaded ${parsed.rawRecords.length} records from ${file.name}`);
      navigate("/dashboard");
    } catch (e) {
      toast.error("Failed to parse file. Ensure it's valid JSON or XML.");
    } finally {
      setIsLoading(false);
    }
  }, [setData, navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const loadSample = () => {
    setData(generateSampleData());
    toast.success("Sample investigation data loaded");
    navigate("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-bold font-mono text-primary cyber-text-glow mb-3">
          UFDR File Analysis
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Upload forensic data reports extracted from mobile devices. Supported formats: JSON, XML.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 cyber-glow-strong"
            : "border-border hover:border-primary/50 hover:bg-card"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".json,.xml,.sqlite,.db"
          onChange={handleFileSelect}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-mono">Parsing forensic data...</p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Drop UFDR file here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-6">Supports JSON, XML formats</p>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5"><FileJson className="h-4 w-4" /> JSON</span>
              <span className="flex items-center gap-1.5"><FileCode className="h-4 w-4" /> XML</span>
              <span className="flex items-center gap-1.5"><Database className="h-4 w-4" /> SQLite</span>
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Button variant="outline" onClick={loadSample} className="font-mono gap-2 cyber-border">
          <Sparkles className="h-4 w-4" />
          Load Sample Investigation Data
        </Button>
      </motion.div>
    </div>
  );
}
