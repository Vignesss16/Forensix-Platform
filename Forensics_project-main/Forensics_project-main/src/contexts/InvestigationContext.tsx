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
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => localStorage.getItem("chanakya-active-case-id"));
  const [activeCase, setActiveCase] = useState<any | null>(null);
  const [isLoadingCaseData, setIsLoadingCaseData] = useState(false);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const stored = localStorage.getItem("chanakya-saved-searches");
    return stored ? JSON.parse(stored) : [];
  });
  const { addNotification } = useNotifications();

  // Load case data when activeCaseId changes
  useEffect(() => {
    if (activeCaseId) {
      localStorage.setItem("chanakya-active-case-id", activeCaseId);
      loadCaseData(activeCaseId);
    } else {
      localStorage.removeItem("chanakya-active-case-id");
      setDataState(null);
      setActiveCase(null);
    }
  }, [activeCaseId]);

  const loadCaseData = useCallback(async (caseId: string) => {
    setIsLoadingCaseData(true);
    try {
      const [caseList, uploads] = await Promise.all([getCases(), getUploads()]);

      const currentCase = caseList.find((c: any) => (c.id || c._id) === caseId);
      if (currentCase) {
        setActiveCase({ ...currentCase, id: currentCase.id || currentCase._id });
      }

      if (uploads && uploads.length > 0) {
        // Find uploads explicitly linked to this case
        const caseUploads = uploads.filter((u: any) => u.case_id === caseId);
        
        if (caseUploads.length > 0) {
          const latestMeta = caseUploads[0];
          // Now fetch the FULL upload containing the megabytes of ufdr_data
          try {
            const latestFull = await getUploadById(latestMeta.id);
            if (latestFull && latestFull.ufdr_data) {
              setDataState(latestFull.ufdr_data);
              addNotification({ type: 'info', title: 'Evidence Synchronized', message: `Restored ${latestFull.file_name} for Case ID: ${caseId}` });
            } else {
               setDataState(null);
            }
          } catch (e) {
            console.error("Failed to load massive UFDR data chunk", e);
            setDataState(null);
          }
        } else {
           // No UFDR uploaded for this specific case yet
           setDataState(null);
        }
      } else {
        setDataState(null);
      }
    } catch (err: any) {
      console.error("Failed to recover case data:", err);
      // Handle authentication expiration specifically
      if (err instanceof Error && err.message.includes("token")) {
        addNotification({ 
          type: 'error', 
          title: 'Authentication Error', 
          message: 'Your session has expired. Please log out and back in.' 
        });
        setDataState(null);
        setActiveCase(null);
      }
    } finally {
      setIsLoadingCaseData(false);
    }
  }, [addNotification]);

  const setData = useCallback((newData: InvestigationData) => {
    setDataState(newData);
    addNotification({
      type: 'info',
      title: 'Investigation Data Loaded',
      message: `Loaded ${newData.chats.length} chats, ${newData.calls.length} calls, and ${newData.contacts.length} contacts`
    });
  }, [addNotification]);

  const clearData = useCallback(() => setDataState(null), []);

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

  const saveSearch = useCallback((name: string, criteria: SearchCriteria) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      criteria,
      createdAt: new Date(),
    };
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem("chanakya-saved-searches", JSON.stringify(updated));
  }, [savedSearches]);

  const deleteSavedSearch = useCallback((id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("chanakya-saved-searches", JSON.stringify(updated));
  }, [savedSearches]);

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
