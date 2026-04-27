import React, { useState, useEffect } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Plus, Trash2, FileText, Users, AlertTriangle, Loader2, Target, ShieldAlert, FileClock, Search, CheckCircle2, Database, BrainCircuit, UserPlus, X, UserCheck, Shield, UserX, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getCases, createCase, updateCase as updateCaseApi, deleteCase as deleteCaseApi, sendCaseInvite, searchOfficers, revokeAccess, getPendingInvites, respondToInvite } from '@/lib/api';
import { generateRoadmap } from "@/lib/localLLM";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { InvestigationRoadmap } from "./InvestigationRoadmap";
import { Skeleton } from "@/components/ui/skeleton";

interface CaseMember {
  id: string;
  officer_id: string;
  role: 'owner' | 'collaborator';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  accepted_at?: string;
  officer?: { user_id: string; email: string };
}

interface Case {
  id: string;
  title: string;
  description: string;
  status: "active" | "closed" | "archived";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  tags: string[];
  notes: string[];
  members?: CaseMember[];
}

interface CaseManagementProps {
  onCaseSelect?: (caseData: Case) => void;
}

export default function CaseManagement({ onCaseSelect }: CaseManagementProps) {
  const { data, setActiveCaseId, setActiveCase: setGlobalActiveCase, activeCaseId } = useInvestigation();
  const [cases, setCases] = useState<Case[]>(() => {
    const cached = localStorage.getItem('chanakya-all-cases');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const casesArray = Array.isArray(parsed) ? parsed : (parsed.data || []);
        return casesArray.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loadingCases, setLoadingCases] = useState(() => cases.length === 0);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const location = useLocation();

  // Joint Operation invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [officerSearch, setOfficerSearch] = useState("");
  const [officerResults, setOfficerResults] = useState<any[]>([]);
  const [searchingOfficer, setSearchingOfficer] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Pending invites for logged-in user
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Get the logged-in officer's ID from localStorage
  const currentUserRef = (() => {
    try { return JSON.parse(localStorage.getItem('chanakya_user') || '{}')?.id || ''; } catch { return ''; }
  })();

  const refreshPendingInvites = async () => {
    try {
      const data = await getPendingInvites();
      setPendingInvites(data || []);
    } catch (e) {
      console.error("Failed to fetch invites");
    }
  };

  useEffect(() => {
    refreshPendingInvites();
  }, []);

  const handleRespondToInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    setRespondingId(inviteId);
    try {
      await respondToInvite(inviteId, action);
      toast.success(action === 'accept' ? 'Joint Operation Accepted' : 'Invite Declined');
      await refreshPendingInvites();
      
      if (action === 'accept') {
        const refreshed = await getCases();
        const fmt = refreshed.map((c: any) => ({ ...c, id: c.id || c._id, createdAt: new Date(c.created_at || c.createdAt), updatedAt: new Date(c.updated_at || c.updatedAt || c.created_at) }));
        setCases(fmt);
      }
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setRespondingId(null);
    }
  };

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState<Partial<Case>>({
    title: "",
    description: "",
    status: "active",
    priority: "medium",
    tags: [],
    notes: []
  });

  // Officer search with debounce for invite modal
  const handleOfficerSearch = async (q: string) => {
    setOfficerSearch(q);
    if (q.trim().length < 2) { setOfficerResults([]); return; }
    setSearchingOfficer(true);
    try {
      const results = await searchOfficers(q.trim());
      setOfficerResults(results);
    } catch { setOfficerResults([]); }
    finally { setSearchingOfficer(false); }
  };

  const handleSendInvite = async (targetRef: string) => {
    if (!selectedCase) return;
    setSendingInvite(true);
    try {
      await sendCaseInvite(selectedCase.id, targetRef);
      toast.success(`Invite sent to ${targetRef}`, { description: `They will see it on their dashboard.` });
      setShowInviteModal(false);
      setOfficerSearch('');
      setOfficerResults([]);
      // Refresh cases to update members list
      const refreshed = await getCases();
      const fmt = refreshed.map((c: any) => ({ ...c, id: c.id || c._id, createdAt: new Date(c.created_at || c.createdAt), updatedAt: new Date(c.updated_at || c.updatedAt || c.created_at) }));
      setCases(fmt);
      const updated = fmt.find((c: any) => c.id === selectedCase.id);
      if (updated) setSelectedCase(updated);
    } catch (e: any) { toast.error(e.message || 'Failed to send invite'); }
    finally { setSendingInvite(false); }
  };

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setIsCreateDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchCases = async () => {
      if (cases.length === 0) setLoadingCases(true);
      try {
        const data = await getCases();
        const formatted = data.map((c: any) => ({
          ...c,
          id: c.id || c._id,
          createdAt: new Date(c.created_at || c.createdAt),
          updatedAt: new Date(c.updated_at || c.updatedAt || c.created_at),
        }));
        setCases(formatted);

        if (activeCaseId) {
          const matched = formatted.find((c: any) => c.id === activeCaseId);
          if (matched) setSelectedCase(matched);
        }
      } catch (err) {
        toast.error('Failed to load cases');
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [location.state]);

  useEffect(() => {
    if (cases && cases.length > 0) {
      localStorage.setItem('chanakya-all-cases', JSON.stringify(cases));
    }
  }, [cases]);

  const handleCreateCase = async () => {
    if (!newCase.title || !newCase.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const created = await createCase({
        title:       newCase.title,
        description: newCase.description,
        status:      newCase.status || 'active',
        priority:    newCase.priority || 'medium',
        tags:        newCase.tags || [],
        notes:       newCase.notes || [],
      });
      const c = {
        ...created,
        id:        created.id || created._id,
        createdAt: new Date(created.created_at || created.createdAt),
        updatedAt: new Date(created.updated_at || created.updatedAt || created.created_at || new Date()),
      };
      setCases(prev => [c, ...prev]);
      setIsCreateDialogOpen(false);
      setNewCase({ title: '', description: '', status: 'active', priority: 'medium', tags: [], notes: [] });
      toast.success('Investigation dossier created successfully');
      
      setSelectedCase(c);
      setActiveCaseId(c.id);
      setGlobalActiveCase(c);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create case');
    }
  };

  const handleUpdateCaseStatus = async (id: string, newStatus: string) => {
    try {
      await updateCaseApi(id, { status: newStatus });
      setCases(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any, updatedAt: new Date() } : c));
      if (selectedCase?.id === id) {
        setSelectedCase(prev => prev ? { ...prev, status: newStatus as any, updatedAt: new Date() } : null);
      }
      toast.success("Dossier status updated");
    } catch (err) {
      toast.error("Failed to update case");
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this intelligence dossier?")) return;
    try {
      await deleteCaseApi(id);
      setCases(prev => prev.filter(c => c.id !== id));
      if (selectedCase?.id === id) setSelectedCase(null);
      if (activeCaseId === id) setActiveCaseId(null);
      toast.success("Intelligence dossier expunged");
    } catch (err) {
      toast.error("Failed to delete case");
    }
  };

  const addNote = async (caseId: string, note: string) => {
    if (!note.trim()) return;
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;
    
    // Prevent duplicate strategies - remove old one if new one is a roadmap
    const isNewRoadmap = note.includes("Based on the UFDR analysis");
    let newNotes = [...(targetCase.notes || [])];
    
    if (isNewRoadmap) {
      newNotes = newNotes.filter(n => !n.includes("Based on the UFDR analysis"));
    }
    
    newNotes.push(note);

    try {
      await updateCaseApi(caseId, { notes: newNotes });
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, notes: newNotes, updatedAt: new Date() } : c));
      if (selectedCase?.id === caseId) {
        setSelectedCase(prev => prev ? { ...prev, notes: newNotes, updatedAt: new Date() } : null);
      }
    } catch (e) {
      toast.error("Failed to append intelligence note");
    }
  };

  const handleToggleRoadmapTask = async (caseId: string, noteIndex: number, taskKey: string) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const [phaseNum, taskIdx] = taskKey.split('-').map(Number);
    const newNotes = [...targetCase.notes];
    let note = newNotes[noteIndex];

    const rawPhases = note.split(/(?=### Phase \d+: )/);
    // Robust Lookup: Find the phase that contains the matching "### Phase X" header
    const targetPhaseIdx = rawPhases.findIndex(p => p.includes(`### Phase ${phaseNum}:`));
    
    if (targetPhaseIdx === -1 || !rawPhases[targetPhaseIdx]) {
      toast.error("Failed to update task: Phase not found");
      return;
    }

    const lines = rawPhases[targetPhaseIdx].split("\n");
    let currentTaskCount = 0;
    
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith("- [")) {
        if (currentTaskCount === taskIdx) {
          currentTaskCount++;
          return line.includes("[x]") ? line.replace("[x]", "[ ]") : line.replace("[ ]", "[x]");
        }
        currentTaskCount++;
      }
      return line;
    });

    rawPhases[targetPhaseIdx] = updatedLines.join("\n");
    newNotes[noteIndex] = rawPhases.join("");

    try {
      await updateCaseApi(caseId, { notes: newNotes });
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, notes: newNotes, updatedAt: new Date() } : c));
      if (selectedCase?.id === caseId) {
        setSelectedCase(prev => prev ? { ...prev, notes: newNotes, updatedAt: new Date() } : null);
      }
    } catch (e) {
      toast.error("Failed to update task state");
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!selectedCase) return;
    if (activeCaseId !== selectedCase.id) {
      toast.error("Activate Operation First", { description: "You must make this case the Active Op to access its UFDR data for AI analysis."});
      return;
    }
    if (!data || (data.chats.length === 0 && data.calls.length === 0 && data.contacts.length === 0 && data.images.length === 0)) {
      toast.error("No Evidence Found", { description: "The Active Op has no UFDR data loaded. Cannot generate strategy." });
      return;
    }

    setIsGenerating(true);
    try {
      const roadmap = await generateRoadmap(data);
      await addNote(selectedCase.id, roadmap);
      toast.success("Intelligence Strategy Generated", { 
        description: "A new tactical roadmap has been appended to the Field Intelligence Log below.",
        duration: 5000
      });
      // Small delay to allow UI to render before scrolling
      setTimeout(() => {
        const logs = document.querySelectorAll('.field-log-entry');
        if (logs.length > 0) logs[logs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } catch (error) {
      console.error(error);
      toast.error("Generation Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const setAsActive = (c: Case) => {
    setActiveCaseId(c.id);
    setGlobalActiveCase(c);
    onCaseSelect?.(c);
    localStorage.removeItem('chanakya-all-cases');
    toast.success(`Active operation switched to: ${c.title}`);
  };

  const getStatusColor = (status: Case["status"]) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "closed": return "bg-zinc-500/20 text-zinc-400 border-zinc-500/50";
      case "archived": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/50";
    }
  };

  const getPriorityColor = (priority: Case["priority"]) => {
    switch (priority) {
      case "low": return "text-emerald-500";
      case "medium": return "text-amber-500";
      case "high": return "text-orange-500";
      case "critical": return "text-red-500";
      default: return "text-zinc-500";
    }
  };

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-[1920px] mx-auto pb-10 px-4 md:px-8 py-4 md:py-6">
      
      {/* ── Pending Invites Notification Area ──────────────────────────────── */}
      <AnimatePresence>
        {pendingInvites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Pending Joint Operation Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-black/20 border border-blue-500/20 rounded-lg p-3 flex flex-col justify-between">
                    <div className="mb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                        Invited by <span className="text-primary font-bold">{invite.inviter?.user_id}</span>
                      </p>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {invite.case?.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-1">
                        CASE ID: {invite.case?.case_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={respondingId === invite.id}
                        onClick={() => handleRespondToInvite(invite.id, 'accept')}
                        className="flex-1 h-7 text-[10px] font-mono tracking-widest uppercase bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none"
                      >
                        {respondingId === invite.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={respondingId === invite.id}
                        onClick={() => handleRespondToInvite(invite.id, 'decline')}
                        className="flex-1 h-7 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-black font-mono tracking-[0.15em] md:tracking-[0.2em] uppercase text-primary mb-1">Intelligence Hub</h1>
          <p className="hidden sm:block text-xs text-muted-foreground font-mono uppercase tracking-widest opacity-60">
            Chanakya Distributed Evidence Network • Central Dossier Management
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-[0.2em] cyber-glow h-10 px-6 font-bold" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Initialize Dossier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-primary/20 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-widest text-primary">New Intelligence Dossier</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Operation Codename *</label>
                <Input
                  value={newCase.title || ""}
                  onChange={(e) => setNewCase(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., OPERATION SATURN"
                  className="font-mono uppercase bg-background/50"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Executive Summary *</label>
                <Textarea
                  value={newCase.description || ""}
                  onChange={(e) => setNewCase(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief context for the investigation..."
                  rows={3}
                  className="resize-none font-mono text-sm bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Initial Status</label>
                  <Select value={newCase.status} onValueChange={(v) => setNewCase(prev => ({ ...prev, status: v as Case["status"] }))}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Threat Level</label>
                  <Select value={newCase.priority} onValueChange={(v) => setNewCase(prev => ({ ...prev, priority: v as Case["priority"] }))}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Routine)</SelectItem>
                      <SelectItem value="medium">Medium (Standard)</SelectItem>
                      <SelectItem value="high">High (Elevated)</SelectItem>
                      <SelectItem value="critical">Critical (Severe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateCase} className="w-full mt-2 font-mono uppercase tracking-widest cyber-border font-bold">
                Deploy Dossier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Case Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
            <div className="flex-1">
               {loadingCases ? (
                  <Skeleton className="h-8 w-16 bg-primary/20" />
               ) : (
                 <p className="text-2xl font-mono font-bold tracking-tighter">{cases.length}</p>
               )}
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Total Dossiers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500"><Target className="h-5 w-5" /></div>
            <div className="flex-1">
               {loadingCases ? (
                  <Skeleton className="h-8 w-16 bg-emerald-500/20" />
               ) : (
                 <p className="text-2xl font-mono font-bold tracking-tighter text-emerald-500">{cases.filter(c => c.status === 'active').length}</p>
               )}
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Active Operations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500"><ShieldAlert className="h-5 w-5" /></div>
            <div className="flex-1">
               {loadingCases ? (
                  <Skeleton className="h-8 w-16 bg-red-500/20" />
               ) : (
                 <p className="text-2xl font-mono font-bold tracking-tighter text-red-500">{cases.filter(c => c.priority === 'critical' || c.priority === 'high').length}</p>
               )}
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">High Threat Level</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500"><FileClock className="h-5 w-5" /></div>
            <div className="flex-1">
               {loadingCases ? (
                  <Skeleton className="h-8 w-16 bg-blue-500/20" />
               ) : (
                 <p className="text-2xl font-mono font-bold tracking-tighter text-blue-500">{cases.filter(c => c.status === 'closed').length}</p>
               )}
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Closed Cases</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Investigation Split View — on mobile: show list OR detail, not both */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0">
        
        {/* Left Pane - Dossier Index: hidden on mobile when a case is selected */}
        <div className={`lg:col-span-4 flex flex-col min-h-[400px] lg:min-h-0 bg-card/20 rounded-2xl border border-border/50 overflow-hidden backdrop-blur-sm ${selectedCase ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search intelligence index..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 font-mono text-xs uppercase tracking-wider bg-card/50"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border bg-black/20 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground opacity-60">Directory Index</span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-primary">Found: {filteredCases.length}</span>
            </div>
            <ScrollArea className="flex-1 p-2">
              <AnimatePresence>
                {loadingCases ? (
                  <div className="space-y-3 px-1 py-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/5 space-y-2 opacity-50 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <Skeleton className="h-4 w-1/2 bg-primary/10" />
                          <Skeleton className="h-3 w-8 bg-muted/20" />
                        </div>
                        <Skeleton className="h-3 w-full bg-muted/5" />
                        <div className="flex justify-between items-center pt-2">
                          <Skeleton className="h-2 w-16 bg-primary/5" />
                          <Skeleton className="h-2 w-12 bg-muted/10" />
                        </div>
                        {/* Subtle scanner overlay */}
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-primary/20 animate-scanline" />
                      </div>
                    ))}
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 opacity-50">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">No matching records</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCases.map((caseData) => {
                      const isSelected = selectedCase?.id === caseData.id;
                      const isActive = activeCaseId === caseData.id;
                      
                      // Calculate progress for this case
                      const roadmapNote = caseData.notes.find(n => n.includes("Based on the UFDR analysis"));
                      const allTasks = roadmapNote?.match(/- \[[ x]\]/g) || [];
                      const completedTasks = roadmapNote?.match(/- \[x\]/g) || [];
                      const progressPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

                      return (
                        <motion.button
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={caseData.id}
                          onClick={() => setSelectedCase(caseData)}
                          className={`w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden group ${
                            isSelected 
                              ? "bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
                              : "border-transparent hover:bg-secondary/40 hover:border-border"
                          }`}
                        >
                          {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                          <div className="pl-2">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`font-mono text-xs uppercase tracking-wider font-bold truncate pr-2 ${isSelected ? 'text-primary' : ''}`}>
                                {caseData.title}
                              </h3>
                              <div className="flex items-center gap-1">
                                {/* Joint Op badge — shown when this case has collaborators */}
                                {(caseData as any).members?.some((m: CaseMember) => m.role === 'collaborator' && m.status === 'accepted') && (
                                  <Badge variant="outline" className="text-[7px] uppercase tracking-widest px-1 py-0 rounded-sm bg-blue-500/10 text-blue-400 border-blue-500/20">
                                    🤝 Joint Op
                                  </Badge>
                                )}
                                <Badge variant="outline" className={`text-[8px] uppercase tracking-widest px-1.5 py-0 rounded-sm ${getStatusColor(caseData.status)}`}>
                                  {caseData.status}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mb-2 opacity-70">
                              {caseData.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-mono uppercase tracking-wider ${getPriorityColor(caseData.priority)}`}>
                                  LVL: {caseData.priority}
                                </span>
                                {roadmapNote && (
                                  <div className="flex items-center gap-1">
                                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                    <span className="text-[8px] font-mono text-primary/60">{progressPercent}% DONE</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">
                                {caseData.updatedAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {/* Progress micro-bar at the bottom */}
                          {roadmapNote && (
                            <div className="absolute bottom-0 left-0 h-[1px] bg-primary/20 w-full">
                              <div className="h-full bg-primary/40 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </div>

        {/* Right Pane - Selected Dossier Intelligence: full width on mobile */}
        <div className={`lg:col-span-8 bg-card/30 rounded-2xl border border-border/50 flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden relative backdrop-blur-md ${selectedCase ? 'flex' : 'hidden lg:flex'}`}>
          {selectedCase ? (
            <div className="h-full flex flex-col relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="p-4 md:p-6 border-b border-border bg-black/10 shrink-0">
                {/* Mobile back button */}
                <button onClick={() => setSelectedCase(null)} className="lg:hidden flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-primary mb-3 transition-colors">
                  ← Back to Index
                </button>
                <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
                  <div>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 mb-3 text-[9px] uppercase tracking-[0.2em] font-mono border-primary/20">
                      Intelligence Dossier #{selectedCase.id.slice(0,6).toUpperCase()}
                    </Badge>
                    <h2 className="text-lg md:text-2xl font-black font-mono tracking-widest uppercase text-foreground">
                      {selectedCase.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeCaseId !== selectedCase.id ? (
                      <Button onClick={() => setAsActive(selectedCase)} className="font-mono text-[10px] uppercase tracking-widest font-bold cyber-border" size="sm">
                         Make Active Op
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-mono text-[10px] uppercase py-1.5 px-3 flex items-center gap-2 tracking-widest">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Operations Active
                      </Badge>
                    )}
                    {/* Show Invite button only if current user is the owner */}
                    {(selectedCase as any).members?.find((m: CaseMember) => m.officer?.user_id === currentUserRef && m.role === 'owner') && (
                      <Button variant="outline" size="sm" onClick={() => setShowInviteModal(true)} className="text-[10px] font-mono uppercase tracking-widest border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Invite Officer
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleUpdateCaseStatus(selectedCase.id, selectedCase.status === 'active' ? 'closed' : 'active')} className="text-[10px] font-mono uppercase">
                      {selectedCase.status === "active" ? "Mark Closed" : "Re-open"}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteCase(selectedCase.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed bg-black/20 p-4 rounded-xl border border-border/50">
                  {selectedCase.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                  <div className="p-3 bg-card/30 rounded-lg border border-border">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Status</p>
                    <p className={`font-mono text-xs uppercase font-bold ${getStatusColor(selectedCase.status).split(' ')[1]}`}>{selectedCase.status}</p>
                  </div>
                  <div className="p-3 bg-card/30 rounded-lg border border-border">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Threat Level</p>
                    <p className={`font-mono text-xs uppercase font-bold ${getPriorityColor(selectedCase.priority)}`}>{selectedCase.priority}</p>
                  </div>
                  <div className="p-3 bg-card/30 rounded-lg border border-border">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Duration</p>
                    <p className="font-mono text-xs text-primary font-bold">
                      {Math.floor((Date.now() - selectedCase.createdAt.getTime()) / (1000 * 60 * 60 * 24))} DAYS ELAPSED
                    </p>
                  </div>
                  <div className="p-3 bg-card/30 rounded-lg border border-border">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Created On</p>
                    <p className="font-mono text-[11px] text-foreground tracking-tighter">{selectedCase.createdAt.toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-card/30 rounded-lg border border-border">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-mono text-[11px] text-foreground tracking-tighter">{selectedCase.updatedAt.toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* ── Joint Operation Team Panel ─────────────────────────── */}
                {(selectedCase as any).members && (selectedCase as any).members.length > 0 && (
                  <div className="mt-4 border border-blue-500/20 rounded-xl bg-blue-500/5 p-4">
                    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 mb-3 flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" /> Joint Operation Team
                    </h4>
                    <div className="space-y-2">
                      {((selectedCase as any).members as CaseMember[]).map((member) => (
                        <div key={member.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            {member.role === 'owner' ? (
                              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : member.status === 'accepted' ? (
                              <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-mono font-bold text-foreground">{member.officer?.user_id || 'Unknown'}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {member.role === 'owner' ? 'Case Owner' : member.status === 'accepted' ? 'Collaborator' : `Invite ${member.status}`}
                              </p>
                            </div>
                          </div>
                          {/* Only owner can revoke collaborators */}
                          {member.role !== 'owner' && (selectedCase as any).members?.find((m: CaseMember) => m.officer?.user_id === currentUserRef && m.role === 'owner') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              disabled={revokingId === member.id}
                              onClick={async () => {
                                setRevokingId(member.id);
                                try {
                                  await revokeAccess(member.id);
                                  toast.success(`Access revoked from ${member.officer?.user_id}`);
                                  // Refresh cases
                                  const refreshed = await getCases();
                                  const fmt = refreshed.map((c: any) => ({ ...c, id: c.id || c._id, createdAt: new Date(c.created_at || c.createdAt), updatedAt: new Date(c.updated_at || c.updatedAt || c.created_at) }));
                                  setCases(fmt);
                                  const updated = fmt.find((c: any) => c.id === selectedCase.id);
                                  if (updated) setSelectedCase(updated);
                                } catch (e: any) { toast.error(e.message); }
                                finally { setRevokingId(null); }
                              }}
                            >
                              {revokingId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Field Notes Section */}
              <div className="flex-1 flex flex-col min-h-0 bg-background/30">
                <div className="px-6 py-3 border-b border-border/50 flex items-center justify-between shrink-0 flex-wrap gap-2">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-primary/70">Field Intelligence Log</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateRoadmap}
                    disabled={isGenerating}
                    className="h-7 text-[9px] font-mono uppercase tracking-widest border-primary/20 hover:bg-primary/10 text-primary"
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <BrainCircuit className="h-3 w-3 mr-1.5" />}
                    {isGenerating ? 'Analyzing...' : 'Generate AI Strategy'}
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-4 md:p-6">
                  <div className="space-y-4">
                    {selectedCase.notes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 opacity-40">
                        <FileText className="h-12 w-12 mb-3" />
                        <span className="text-xs font-mono uppercase tracking-widest">Log is empty</span>
                      </div>
                    ) : (
                      selectedCase.notes.map((note, i) => {
                        const isRoadmap = note.includes("Based on the UFDR analysis");
                        return (
                          <div key={i} className={`field-log-entry p-4 rounded-xl border border-border/50 relative group ${isRoadmap ? 'bg-primary/5 border-primary/20 p-6' : 'bg-card/50'}`}>
                            <span className="absolute top-4 right-4 text-[9px] font-mono text-muted-foreground opacity-50">Log #{i+1}</span>
                            {isRoadmap ? (
                              <InvestigationRoadmap 
                                content={note} 
                                onToggleTask={(taskKey) => handleToggleRoadmapTask(selectedCase.id, i, taskKey)} 
                              />
                            ) : (
                              <p className="text-sm text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">{note}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 md:p-6 pt-0 shrink-0">
                  <div className="flex items-start gap-3 bg-black/20 p-3 rounded-xl border border-border">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-serif text-sm">च</div>
                    <Textarea
                      placeholder="Add insight to dossier..."
                      className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-sm font-mono min-h-[40px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const val = e.currentTarget.value;
                          if(val) {
                            addNote(selectedCase.id, val);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      className="shrink-0 uppercase font-mono tracking-widest text-[10px] cyber-border h-8"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                        addNote(selectedCase.id, input.value);
                        input.value = "";
                      }}
                    >
                      Append Log
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full rounded-2xl border border-dashed border-border flex flex-col items-center justify-center bg-card/10 text-center p-10">
              <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 border border-primary/10 shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)]">
                <Target className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-mono uppercase tracking-[0.2em] font-black text-foreground mb-2">No Dossier Selected</h3>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest opacity-60 max-w-sm">
                Select an intelligence dossier from the index to view operational details and field notes.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Invite Officer Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showInviteModal && selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowInviteModal(false); setOfficerSearch(''); setOfficerResults([]); } }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-card border border-blue-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black font-mono uppercase tracking-[0.15em] text-primary">Invite Officer</h2>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                    Joint Operation: {selectedCase.title}
                  </p>
                </div>
                <button onClick={() => { setShowInviteModal(false); setOfficerSearch(''); setOfficerResults([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search box */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Officer ID (e.g. OFF111)"
                  value={officerSearch}
                  onChange={(e) => handleOfficerSearch(e.target.value)}
                  className="pl-9 font-mono text-xs uppercase tracking-wider bg-black/20 border-border/50"
                  autoFocus
                />
                {searchingOfficer && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                )}
              </div>

              {/* Results */}
              <div className="space-y-2 min-h-[80px]">
                {officerResults.length === 0 && officerSearch.length >= 2 && !searchingOfficer && (
                  <p className="text-[10px] font-mono text-muted-foreground text-center py-6 opacity-60 uppercase tracking-widest">No officers found</p>
                )}
                {officerResults.length === 0 && officerSearch.length < 2 && (
                  <p className="text-[10px] font-mono text-muted-foreground text-center py-6 opacity-40 uppercase tracking-widest">Type an officer ID to search</p>
                )}
                {officerResults.map((officer) => (
                  <div key={officer.id} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 border border-border/40 hover:border-blue-500/30 transition-all">
                    <div>
                      <p className="text-sm font-mono font-bold text-primary uppercase">{officer.user_id}</p>
                      <p className="text-[10px] text-muted-foreground">{officer.email}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={sendingInvite}
                      onClick={() => handleSendInvite(officer.user_id)}
                      className="font-mono text-[10px] uppercase tracking-widest h-7 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                    >
                      {sendingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                      Invite
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-[9px] font-mono text-muted-foreground/50 mt-4 text-center uppercase tracking-widest">
                The officer will see a notification on their dashboard to accept or decline.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}