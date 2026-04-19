import React, { useState, useEffect } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Plus, Edit, Trash2, FileText, Users, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getCases, createCase, updateCase, deleteCase } from '@/lib/api';

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
}

interface CaseManagementProps {
  onCaseSelect?: (caseData: Case) => void;
}

export default function CaseManagement({ onCaseSelect }: CaseManagementProps) {
  const { data } = useInvestigation();
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState<Partial<Case>>({
    title: "",
    description: "",
    status: "active",
    priority: "medium",
    tags: [],
    notes: []
  });

  // Load cases from MongoDB on mount
useEffect(() => {
  const fetchCases = async () => {
    try {
      const data = await getCases();
      setCases(data.map((c: any) => ({
        ...c,
        id:        c.id || c._id,
        createdAt: new Date(c.created_at || c.createdAt),
        updatedAt: new Date(c.updated_at || c.updatedAt || c.created_at),
      })));
    } catch (err) {
      toast.error('Failed to load cases');
    } finally {
      setLoadingCases(false);
    }
  };
  fetchCases();
}, []);

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
      setCases(prev => [{
        ...created,
        id:        created.id || created._id,
        createdAt: new Date(created.created_at || created.createdAt),
        updatedAt: new Date(created.updated_at || created.updatedAt || created.created_at || new Date()),
      }, ...prev]);
      setIsCreateDialogOpen(false);
      setNewCase({ title: '', description: '', status: 'active', priority: 'medium', tags: [], notes: [] });
      toast.success('Case created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create case');
    }
  };

  const updateCase = (id: string, updates: Partial<Case>) => {
    setCases(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
    ));
    toast.success("Case updated successfully");
  };

  const deleteCase = (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    if (selectedCase?.id === id) {
      setSelectedCase(null);
    }
    toast.success("Case deleted successfully");
  };

  const addNote = (caseId: string, note: string) => {
    if (!note.trim()) return;
    setCases(prev => prev.map(c =>
      c.id === caseId
        ? { ...c, notes: [...c.notes, note], updatedAt: new Date() }
        : c
    ));
  };

  const getStatusColor = (status: Case["status"]) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "closed": return "bg-gray-500";
      case "archived": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: Case["priority"]) => {
    switch (priority) {
      case "low": return "text-green-600";
      case "medium": return "text-yellow-600";
      case "high": return "text-orange-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary cyber-text-glow">Case Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and track forensic investigations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newCase.title || ""}
                  onChange={(e) => setNewCase(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Case title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={newCase.description || ""}
                  onChange={(e) => setNewCase(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Case description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={newCase.status}
                    onValueChange={(value) => setNewCase(prev => ({ ...prev, status: value as Case["status"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={newCase.priority}
                    onValueChange={(value) => setNewCase(prev => ({ ...prev, priority: value as Case["priority"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateCase} className="w-full">
                Create Case
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Cases ({cases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {cases.map((caseData) => (
                    <div
                      key={caseData.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCase?.id === caseData.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedCase(caseData);
                        onCaseSelect?.(caseData);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm truncate">{caseData.title}</h3>
                        <div className="flex items-center gap-1 ml-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(caseData.status)}`} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {caseData.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(caseData.priority)}`}>
                          {caseData.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {caseData.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {cases.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No cases created yet</p>
                      <p className="text-xs mt-1">Create your first case to get started</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Case Details */}
        <div className="lg:col-span-2">
          {selectedCase ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {selectedCase.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getPriorityColor(selectedCase.priority)}>
                        {selectedCase.priority}
                      </Badge>
                      <Badge variant="outline">
                        <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(selectedCase.status)}`} />
                        {selectedCase.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCase(selectedCase.id, {
                          status: selectedCase.status === "active" ? "closed" : "active"
                        })}
                      >
                        {selectedCase.status === "active" ? "Close" : "Reopen"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCase(selectedCase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{selectedCase.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Created:</span> {selectedCase.createdAt.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {selectedCase.updatedAt.toLocaleString()}
                    </div>
                  </div>
                  {selectedCase.tags.length > 0 && (
                    <div className="mt-4">
                      <span className="font-medium text-sm">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCase.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Investigation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {selectedCase.notes.map((note, i) => (
                        <div key={i} className="p-3 bg-secondary rounded-lg">
                          <p className="text-sm">{note}</p>
                        </div>
                      ))}
                      {selectedCase.notes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No notes added yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addNote(selectedCase.id, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addNote(selectedCase.id, input.value);
                        input.value = "";
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a case to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}