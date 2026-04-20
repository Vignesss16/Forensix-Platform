import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileJson, FileCode, Database, Loader2, Sparkles, FolderOpen, Plus, X, CheckCircle2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

import { useInvestigation } from "@/contexts/InvestigationContext";
import { parseUploadedFile, generateSampleData } from "@/lib/parser";
import { getCases, createCase } from "@/lib/api";
import { toast } from "sonner";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setData, activeCaseId, setActiveCaseId, setActiveCase: setGlobalActiveCase } = useInvestigation();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Case gate state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showCaseGate, setShowCaseGate] = useState(false);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);

  const navigate = useNavigate();

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(contentRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    )
    .fromTo(dropzoneRef.current,
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: "elastic.out(1, 0.75)" },
      "-=0.4"
    );
  }, { scope: containerRef });

  const openCaseGate = async (file: File) => {
    setPendingFile(file);
    setShowCaseGate(true);
    setLoadingCases(true);
    try {
      const cases = await getCases();
      setAllCases(cases.map((c: any) => ({ ...c, id: c.id || c._id })));
      // Pre-select active case if there is one
      if (activeCaseId) setSelectedCaseId(activeCaseId);
    } catch {
      toast.error("Failed to load cases");
    } finally {
      setLoadingCases(false);
    }
  };

  const processFile = useCallback(async (file: File, caseId?: string) => {
    setIsLoading(true);
    const effectiveCaseId = caseId || activeCaseId;
    try {
      const content = await file.text();
      const parsed = parseUploadedFile(content, file.name);
      if (parsed.rawRecords.length === 0) {
        toast.error("No forensic records found in the file");
        return;
      }
      setData(parsed);

      // Save to Database
      try {
        const token = localStorage.getItem('forensix_token');
        if (token) {
          await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              ufdrData: parsed,
              caseId: effectiveCaseId,
            }),
          });
        }
      } catch (uploadErr) {
        console.error('Failed to save upload to DB:', uploadErr);
      }

      toast.success(`Loaded ${parsed.rawRecords.length} records from ${file.name}`);
      navigate("/dashboard");
    } catch (e) {
      toast.error("Failed to parse file. Ensure it's valid JSON or XML.");
    } finally {
      setIsLoading(false);
    }
  }, [setData, navigate, activeCaseId]);

  const handleCaseSelected = async () => {
    if (!pendingFile) return;
    if (!selectedCaseId) { toast.error("Please select or create a case first"); return; }
    setShowCaseGate(false);
    await processFile(pendingFile, selectedCaseId);
  };

  const handleCreateAndUpload = async () => {
    if (!newCaseTitle.trim()) { toast.error("Case title is required"); return; }
    if (!pendingFile) return;
    setCreatingCase(true);
    try {
      const created = await createCase({
        title: newCaseTitle,
        description: newCaseDesc || `Case for ${pendingFile.name}`,
        status: 'active',
        priority: 'medium',
        tags: [],
        notes: [],
      });
      const cid = created.id || created._id;
      setActiveCaseId(cid);
      setGlobalActiveCase({ ...created, id: cid });
      // Invalidate cases cache
      localStorage.removeItem('forensix-all-cases');
      toast.success(`Case "${newCaseTitle}" created`);
      setShowCaseGate(false);
      await processFile(pendingFile, cid);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create case');
    } finally {
      setCreatingCase(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    openCaseGate(file);
  }, [activeCaseId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCaseGate(file);
  };

  const loadSample = () => {
    setData(generateSampleData());
    toast.success("Sample investigation data loaded");
    navigate("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 overflow-hidden bg-background" ref={containerRef}>
      <div className="text-center mb-10 opacity-0" ref={contentRef}>
        <h1 className="text-4xl font-bold font-mono text-primary cyber-text-glow mb-3">
          UFDR File Analysis
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Upload forensic data reports extracted from mobile devices. Supported formats: JSON, XML.
        </p>
        {activeCaseId && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Evidence will be linked to the active case</span>
          </div>
        )}
      </div>

      <div
        ref={dropzoneRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer relative group opacity-0 ${
          isDragging
            ? "border-primary bg-primary/5 cyber-glow-strong"
            : "border-border hover:border-primary/50 hover:bg-card"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
        <input id="file-input" type="file" className="hidden" accept=".json,.xml,.sqlite,.db" onChange={handleFileSelect} />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-mono">Parsing forensic data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative inline-block">
              <Upload className="h-14 w-14 text-primary mx-auto" />
              <div className="absolute -inset-4 border border-primary/20 rounded-full animate-ping-slow opacity-20" />
            </div>
            <div>
              <p className="text-xl font-semibold mb-2">Drop UFDR file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Professional investigative report parsing</p>
              <p className="text-[11px] text-amber-500/80 font-mono mt-2 uppercase tracking-widest">
                ⚠ You will be prompted to select or create a case for this evidence
              </p>
            </div>
            <div className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full"><FileJson className="h-4 w-4" /> JSON</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full"><FileCode className="h-4 w-4" /> XML</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full"><Database className="h-4 w-4" /> SQLite</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <Button variant="ghost" onClick={loadSample} className="font-mono gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Sparkles className="h-4 w-4" />
          Quick Load Sample Investigation Data
        </Button>
      </div>

      {/* ── Case Gate Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCaseGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCaseGate(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black font-mono uppercase tracking-widest text-primary">Link to a Case</h2>
                  <p className="text-xs text-muted-foreground mt-1">{pendingFile?.name} • Select or create a case to proceed</p>
                </div>
                <button onClick={() => setShowCaseGate(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>

              {/* Existing cases */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Select Existing Case</p>
                {loadingCases ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-mono">Loading cases...</span>
                  </div>
                ) : allCases.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 font-mono text-center py-3">No existing cases — create one below</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {allCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCaseId(c.id); setShowNewCaseForm(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 border transition-all ${
                          selectedCaseId === c.id
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/20 hover:bg-secondary/30 text-muted-foreground'
                        }`}
                      >
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold truncate">{c.title}</p>
                          <p className="text-[9px] opacity-60 truncate">{c.description}</p>
                        </div>
                        {selectedCaseId === c.id && <CheckCircle2 className="h-4 w-4 shrink-0 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new case inline */}
              <div className="border-t border-border pt-4 space-y-3">
                <button
                  onClick={() => { setShowNewCaseForm(s => !s); setSelectedCaseId(null); }}
                  className="text-[10px] font-mono uppercase tracking-widest text-primary/70 hover:text-primary flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Create New Case Instead
                </button>

                <AnimatePresence>
                  {showNewCaseForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      <Input
                        placeholder="Case title *"
                        value={newCaseTitle}
                        onChange={e => setNewCaseTitle(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <Textarea
                        placeholder="Brief description (optional)"
                        value={newCaseDesc}
                        onChange={e => setNewCaseDesc(e.target.value)}
                        rows={2}
                        className="text-sm font-mono resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCaseGate(false)} className="flex-1 font-mono text-xs uppercase tracking-widest">Cancel</Button>
                {showNewCaseForm ? (
                  <Button
                    onClick={handleCreateAndUpload}
                    disabled={creatingCase || !newCaseTitle.trim()}
                    className="flex-1 font-mono text-xs uppercase tracking-widest cyber-glow"
                  >
                    {creatingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Upload'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCaseSelected}
                    disabled={!selectedCaseId}
                    className="flex-1 font-mono text-xs uppercase tracking-widest cyber-glow"
                  >
                    Upload Evidence
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
