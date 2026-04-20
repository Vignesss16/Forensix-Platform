// @refresh reset
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { InvestigationData, SuspiciousItem, SUSPICIOUS_KEYWORDS, CRYPTO_WALLET_PATTERNS, isInternationalNumber, ChatRecord } from "@/lib/types";
import { useNotifications } from "./NotificationContext";
import { getUploads, getUploadById, getCases } from "@/lib/api";



interface SearchCriteria {
  query: string;
  dateRange?: { from: Date; to: Date };
  platforms: string[];
  recordTypes: string[];
  contacts: string[];
  severity?: "low" | "medium" | "high";
  hasLocation?: boolean;
  regexMode: boolean;
  caseSensitive: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  criteria: SearchCriteria;
  createdAt: Date;
}

interface InvestigationContextType {
  data: InvestigationData | null;
  setData: (data: InvestigationData) => void;
  clearData: () => void;
  suspiciousItems: SuspiciousItem[];
  foreignNumbers: string[];
  cryptoWallets: string[];
  searchChats: (query: string) => ChatRecord[];
  savedSearches: SavedSearch[];
  saveSearch: (name: string, criteria: SearchCriteria) => void;
  deleteSavedSearch: (id: string) => void;
  activeCaseId: string | null;
  setActiveCaseId: (id: string | null) => void;
  activeCase: any | null;
  setActiveCase: (caseData: any) => void;
  isLoadingCaseData: boolean;
}


const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<InvestigationData | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => localStorage.getItem("forensix-active-case-id"));
  const [activeCase, setActiveCase] = useState<any | null>(null);
  const [isLoadingCaseData, setIsLoadingCaseData] = useState(false);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const stored = localStorage.getItem("forensix-saved-searches");
    return stored ? JSON.parse(stored) : [];
  });
  const { addNotification } = useNotifications();

  // Load case data when activeCaseId changes
  useEffect(() => {
    if (activeCaseId) {
      localStorage.setItem("forensix-active-case-id", activeCaseId);
      loadCaseData(activeCaseId);
    } else {
      localStorage.removeItem("forensix-active-case-id");
      setDataState(null);
      setActiveCase(null);
    }
  }, [activeCaseId]);

  const loadCaseData = async (caseId: string) => {
    setIsLoadingCaseData(true);
    try {
      // Fire both queries in parallel — saves ~500ms vs sequential
      const [caseList, uploads] = await Promise.all([getCases(), getUploads()]);

      // Restore Case Metadata
      const currentCase = caseList.find((c: any) => (c.id || c._id) === caseId);
      if (currentCase) {
        setActiveCase({ ...currentCase, id: currentCase.id || currentCase._id });
      }

      // Restore Uploaded Forensic Data
      if (uploads && uploads.length > 0) {
        const caseUploads = uploads.filter((u: any) => u.case_id === caseId);
        const latest = caseUploads[0] || uploads[0];
        if (latest.ufdr_data) {
          setDataState(latest.ufdr_data);
          addNotification({ type: 'info', title: 'Evidence Synchronized', message: `Restored ${latest.file_name} for Case ID: ${caseId}` });
        }
      }
    } catch (err) {
      console.error("Failed to recover case data:", err);
    } finally {
      setIsLoadingCaseData(false);
    }
  };


  const setData = (newData: InvestigationData) => {
    setDataState(newData);
    // Add notification when new data is loaded
    addNotification({
      type: 'info',
      title: 'Investigation Data Loaded',
      message: `Loaded ${newData.chats.length} chats, ${newData.calls.length} calls, and ${newData.contacts.length} contacts`
    });
  };

  const clearData = () => setDataState(null);

  const suspiciousItems: SuspiciousItem[] = React.useMemo(() => {
    if (!data) return [];
    const items: SuspiciousItem[] = [];

    data.chats.forEach((chat) => {
      const msgLower = chat.message.toLowerCase();
      const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => msgLower.includes(kw));
      if (matchedKeywords.length > 0) {
        items.push({
          record: chat,
          reason: `Contains keywords: ${matchedKeywords.join(", ")}`,
          severity: matchedKeywords.length >= 3 ? "high" : matchedKeywords.length >= 2 ? "medium" : "low",
        });
      }

      CRYPTO_WALLET_PATTERNS.forEach((pattern) => {
        if (pattern.test(chat.message)) {
          items.push({
            record: chat,
            reason: "Contains crypto wallet address",
            severity: "high",
          });
        }
      });
    });

    return items;
  }, [data]);

  // Notify about suspicious items
  useEffect(() => {
    if (suspiciousItems.length > 0) {
      const highSeverity = suspiciousItems.filter(item => item.severity === 'high').length;
      const mediumSeverity = suspiciousItems.filter(item => item.severity === 'medium').length;

      if (highSeverity > 0) {
        addNotification({
          type: 'error',
          title: 'High Priority Findings Detected',
          message: `${highSeverity} high-severity suspicious items found in investigation data`
        });
      } else if (mediumSeverity > 0) {
        addNotification({
          type: 'warning',
          title: 'Suspicious Items Detected',
          message: `${suspiciousItems.length} suspicious items found in investigation data`
        });
      }
    }
  }, [suspiciousItems, addNotification]);

  const foreignNumbers = React.useMemo(() => {
    if (!data) return [];
    const numbers = new Set<string>();
    data.chats.forEach((c) => {
      if (isInternationalNumber(c.from)) numbers.add(c.from);
      if (isInternationalNumber(c.to)) numbers.add(c.to);
    });
    data.calls.forEach((c) => {
      if (isInternationalNumber(c.from)) numbers.add(c.from);
      if (isInternationalNumber(c.to)) numbers.add(c.to);
    });
    data.contacts.forEach((c) => {
      if (isInternationalNumber(c.phone)) numbers.add(c.phone);
    });
    return Array.from(numbers);
  }, [data]);

  const cryptoWallets = React.useMemo(() => {
    if (!data) return [];
    const wallets = new Set<string>();
    data.chats.forEach((chat) => {
      CRYPTO_WALLET_PATTERNS.forEach((pattern) => {
        const matches = chat.message.match(pattern);
        if (matches) matches.forEach((m) => wallets.add(m));
      });
    });
    return Array.from(wallets);
  }, [data]);

  const searchChats = useCallback((query: string): ChatRecord[] => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.chats.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.from.toLowerCase().includes(q) ||
        c.to.toLowerCase().includes(q) ||
        (c.platform && c.platform.toLowerCase().includes(q))
    );
  }, [data]);

  const saveSearch = (name: string, criteria: SearchCriteria) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      criteria,
      createdAt: new Date(),
    };
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem("forensix-saved-searches", JSON.stringify(updated));
  };

  const deleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("forensix-saved-searches", JSON.stringify(updated));
  };

  // Memoize the context value to prevent all consumers re-rendering when unrelated state changes
  const contextValue = useMemo(() => ({
    data,
    setData,
    clearData,
    suspiciousItems,
    foreignNumbers,
    cryptoWallets,
    searchChats,
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    activeCaseId,
    setActiveCaseId,
    activeCase,
    setActiveCase,
    isLoadingCaseData
  }), [data, suspiciousItems, foreignNumbers, cryptoWallets, searchChats, savedSearches, activeCaseId, activeCase, isLoadingCaseData]);

  return (
    <InvestigationContext.Provider value={contextValue}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (!ctx) throw new Error("useInvestigation must be used within InvestigationProvider");
  return ctx;
}
