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
  const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);
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
    } catch (err) {
      console.error("Failed to fetch cases from API, falling back to cache", err);
      // Fallback to cache exactly like CaseManagement.tsx
      const cached = localStorage.getItem('chanakya-all-cases');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAllCases(parsed.map((c: any) => ({ ...c, id: c.id || c._id })));
          if (activeCaseId) setSelectedCaseId(activeCaseId);
        } catch (e) {
           toast.error("Failed to load cases");
        }
      } else {
        toast.error("Failed to load cases");
      }
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
        const token = localStorage.getItem('chanakya_token');
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

  const processMediaFiles = useCallback(async (files: File[], caseId?: string) => {
    setIsLoading(true);
    const effectiveCaseId = caseId || activeCaseId;
    if (!effectiveCaseId) { toast.error("No active case to attach media"); setIsLoading(false); return; }

    try {
      const token = localStorage.getItem('chanakya_token');
      // 1. Fetch existing case upload data to append to
      const res = await fetch(`/api/uploads?caseId=${effectiveCaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const existingUploads = await res.json();
      
      let baseData = { chats: [], calls: [], contacts: [], images: [], rawRecords: [] };
      let uploadIdToUpdate = null;

      if (existingUploads && existingUploads.length > 0) {
        // Fetch full data for the first upload
        const fullRes = await fetch(`/api/uploads?id=${existingUploads[0].id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const fullUpload = await fullRes.json();
        if (fullUpload && fullUpload.ufdr_data) {
          baseData = fullUpload.ufdr_data;
          uploadIdToUpdate = fullUpload.id;
        }
      }

      // 2. Process media files
      const newImages = files.map(f => {
        // Mock EXIF extraction: randomly attach GPS to 30% of images around India
        const hasGps = Math.random() > 0.7;
        const lat = 20.5937 + (Math.random() * 10 - 5);
        const lng = 78.9629 + (Math.random() * 10 - 5);
        
        return {
          filename: f.name,
          timestamp: new Date(f.lastModified).toISOString(),
          location: hasGps ? { lat, lng } : undefined,
          device: "Extracted Mobile Device",
          url: URL.createObjectURL(f) // Local preview URL
        };
      });

      baseData.images = [...(baseData.images || []), ...newImages];
      setData(baseData);

      // 3. Save back to DB
      if (token) {
        if (uploadIdToUpdate) {
           // We would typically PATCH the upload, but for this demo, we'll create a new metadata upload
           // linking the media folder
           await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              fileName: `Media_Folder_${files.length}_files`,
              fileType: "folder",
              fileSize: files.reduce((acc, f) => acc + f.size, 0),
              ufdrData: baseData, // Save combined data
              caseId: effectiveCaseId,
            }),
          });
        }
      }

      toast.success(`Successfully attached ${files.length} media files to the case`);
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to process media files");
    } finally {
      setIsLoading(false);
    }
  }, [setData, activeCaseId, navigate]);

  const handleCaseSelected = async () => {
    if (!selectedCaseId) { toast.error("Please select or create a case first"); return; }
    setShowCaseGate(false);
    if (pendingFile) await processFile(pendingFile, selectedCaseId);
    if (pendingMediaFiles.length > 0) await processMediaFiles(pendingMediaFiles, selectedCaseId);
  };

  const handleCreateAndUpload = async () => {
    if (!newCaseTitle.trim()) { toast.error("Case title is required"); return; }
    setCreatingCase(true);
    try {
      const created = await createCase({
        title: newCaseTitle,
        description: newCaseDesc || `Case for Evidence`,
        status: 'active',
        priority: 'medium',
        tags: [],
        notes: [],
      });
      const cid = created.id || created._id;
      setActiveCaseId(cid);
      setGlobalActiveCase({ ...created, id: cid });
      localStorage.removeItem('chanakya-all-cases');
      toast.success(`Case "${newCaseTitle}" created`);
      setShowCaseGate(false);
      
      if (pendingFile) await processFile(pendingFile, cid);
      if (pendingMediaFiles.length > 0) await processMediaFiles(pendingMediaFiles, cid);
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

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (mediaFiles.length === 0) {
      toast.error("No images or videos found in the selected folder");
      return;
    }
    setPendingMediaFiles(mediaFiles);
    setPendingFile(null); // Clear UFDR if exists
    
    // If active case exists, process directly. Otherwise open gate.
    if (activeCaseId) {
      processMediaFiles(mediaFiles, activeCaseId);
    } else {
      openCaseGate(mediaFiles[0]); // Hack to open gate
    }
  };

  const loadSample = () => {
    setData(generateSampleData());
    toast.success("Sample investigation data loaded");
    navigate("/dashboard");
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto bg-background" ref={containerRef}>
      <div className="mt-8 md:mt-0 text-center mb-10 opacity-0" ref={contentRef}>
        <h1 className="text-4xl font-black font-mono text-primary cyber-text-glow mb-3 tracking-[0.2em] uppercase">
          Evidence Upload
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
        <input id="folder-input" type="file" className="hidden" webkitdirectory="" directory="" multiple onChange={handleFolderSelect} />

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

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => document.getElementById("folder-input")?.click()}
          className="font-mono gap-2 text-primary border-primary/20 hover:bg-primary/5 uppercase tracking-widest text-[10px] h-9"
        >
          <FolderOpen className="h-4 w-4" />
          Upload Images Folder
        </Button>
        <Button 
          variant="ghost" 
          onClick={loadSample} 
          className="font-mono gap-2 text-muted-foreground hover:text-primary transition-colors text-[10px] h-9"
        >
          <Sparkles className="h-4 w-4" />
          Quick Load Sample
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
