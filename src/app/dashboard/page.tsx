"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  Database,
  User,
  LogOut,
  List,
  RefreshCw,
  FileText,
  BarChart3,
  ArrowLeft,
  Activity,
  Layers,
  ArrowRight,
  X,
  ExternalLink,
  Calendar,
  Edit2,
  Eye
} from "lucide-react";
import CustomSingleDatePicker from "@/components/CustomSingleDatePicker";
import "../globals.css";

interface ProposalRecord {
  idx?: number;
  proposal_no: string;
  customer_name: string;
  payment_amount: string | number;
  gwp: string | number;
  login_date: string;
  proposal_status: string;
  policy_no: string;
  policy_start_date: string;
  no_of_lives: number | string;
  business_type: string;
  plan: string;
  agent_name: string;
  updated_at: string;
}

interface FaveoLogRecord {
  id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  total_records: number;
  uploaded_records: number;
  error_message: string | null;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<FaveoLogRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [allProposals, setAllProposals] = useState<ProposalRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const mIndex = new Date().getMonth();
    return [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ][mIndex];
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });
  const [dateFilterType, setDateFilterType] = useState<"login" | "start">("login");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]); // empty represents ALL selected
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]); // empty represents ALL selected
  const [showMonthYearPicker, setShowMonthYearPicker] = useState<boolean>(false);
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);
  const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatStatuses, setNewCatStatuses] = useState<string[]>([]);
  const [expandedRawStatusesCatKey, setExpandedRawStatusesCatKey] = useState<string | null>(null);
  const [showAllRawStatuses, setShowAllRawStatuses] = useState<boolean>(false);

  // Dynamic status-category card metrics
  const [inforceCardCategory, setInforceCardCategory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tfc_inforce_card_cat") || "inforce";
    }
    return "inforce";
  });
  const [pendingCardCategory, setPendingCardCategory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tfc_pending_card_cat") || "pending";
    }
    return "pending";
  });
  const [showInforceEditDropdown, setShowInforceEditDropdown] = useState<boolean>(false);
  const [showPendingEditDropdown, setShowPendingEditDropdown] = useState<boolean>(false);

  // Custom user-defined metric cards
  const [customCards, setCustomCards] = useState<Array<{ id: string; name: string; category: string }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tfc_custom_stat_cards");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isCreatingStatCard, setIsCreatingStatCard] = useState<boolean>(false);
  const [newStatCardName, setNewStatCardName] = useState<string>("");
  const [newStatCardCategory, setNewStatCardCategory] = useState<string>("");

  // Premium toggle: Net vs GWP premium collected
  const [gwpCardMode, setGwpCardMode] = useState<"gwp" | "net">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tfc_gwp_card_mode") as "gwp" | "net") || "gwp";
    }
    return "gwp";
  });
  const [gwpCardCategory, setGwpCardCategory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tfc_gwp_card_cat") || "inforce";
    }
    return "inforce";
  });
  const [showGwpEditDropdown, setShowGwpEditDropdown] = useState<boolean>(false);
  const [selectedPlanDetailsName, setSelectedPlanDetailsName] = useState<string | null>(null);
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>("ALL");
  const [selectedStatsCatModal, setSelectedStatsCatModal] = useState<string | null>(null);
  const [statsCatModalTitle, setStatsCatModalTitle] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics">("dashboard");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [analyticsSearch, setAnalyticsSearch] = useState<string>("");

  const getCategoryCount = (categoryKey: string) => {
    const members = categories[categoryKey] || [];
    if (members.length === 0) {
      return filteredProposalsForStats.filter(item => {
        const status = (item.proposal_status || "").toLowerCase();
        return status === categoryKey.toLowerCase();
      }).length;
    }
    return filteredProposalsForStats.filter(item => {
      return members.includes(item.proposal_status);
    }).length;
  };

  const handleSaveStatCard = () => {
    if (!newStatCardName.trim() || !newStatCardCategory) return;
    const newCard = {
      id: Date.now().toString(),
      name: newStatCardName.trim(),
      category: newStatCardCategory
    };
    const updated = [...customCards, newCard];
    setCustomCards(updated);
    localStorage.setItem("tfc_custom_stat_cards", JSON.stringify(updated));
    
    setIsCreatingStatCard(false);
    setNewStatCardName("");
    setNewStatCardCategory("");
  };

  const getStatusGroup = (statusStr: string): string => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("inforce")) return "inforce";
    if (s.includes("cancelled") || s.includes("cancellation")) return "cancelled";
    if (s.includes("declined") || s.includes("decline")) return "declined";
    return "pending";
  };

  // Dynamic extraction of all unique raw statuses present in the dataset
  const allUniqueStatuses = React.useMemo(() => {
    const statuses = new Set<string>();
    allProposals.forEach(item => {
      if (item.proposal_status) {
        statuses.add(item.proposal_status);
      }
    });
    return Array.from(statuses).sort();
  }, [allProposals]);

  const saveCategories = (updated: Record<string, string[]>) => {
    setCategories(updated);
    localStorage.setItem("tfc_status_categories_v3", JSON.stringify(updated));
  };

  const handleEditCategory = (cat: string) => {
    setEditingCategoryKey(cat);
    setNewCatName(cat);
    setNewCatStatuses(categories[cat] || []);
    setIsCreatingCategory(true);
  };

  const handleCancelCategory = () => {
    setIsCreatingCategory(false);
    setEditingCategoryKey(null);
    setNewCatName("");
    setNewCatStatuses([]);
  };

  const handleRestoreDefaults = () => {
    const defaultMap: Record<string, string[]> = {
      inforce: [],
      pending: [],
      cancelled: [],
      declined: []
    };
    allUniqueStatuses.forEach(status => {
      const s = (status || "").toLowerCase();
      let group = "pending";
      if (s.includes("inforce")) group = "inforce";
      else if (s.includes("cancelled") || s.includes("cancellation")) group = "cancelled";
      else if (s.includes("declined") || s.includes("decline")) group = "declined";
      
      defaultMap[group].push(status);
    });
    saveCategories(defaultMap);
  };

  // Initialize categories once unique statuses are loaded
  useEffect(() => {
    if (allUniqueStatuses.length === 0) return;
    
    const saved = localStorage.getItem("tfc_status_categories_v3");
    if (saved) {
      try {
        setCategories(JSON.parse(saved));
        return;
      } catch (e) {
        console.error("Error parsing saved status categories:", e);
      }
    }
    
    // Fallback: build default categories dynamically
    const defaultMap: Record<string, string[]> = {
      inforce: [],
      pending: [],
      cancelled: [],
      declined: []
    };
    allUniqueStatuses.forEach(status => {
      const s = (status || "").toLowerCase();
      let group = "pending";
      if (s.includes("inforce")) group = "inforce";
      else if (s.includes("cancelled") || s.includes("cancellation")) group = "cancelled";
      else if (s.includes("declined") || s.includes("decline")) group = "declined";
      
      defaultMap[group].push(status);
    });
    setCategories(defaultMap);
    localStorage.setItem("tfc_status_categories_v3", JSON.stringify(defaultMap));
  }, [allUniqueStatuses]);

  const MONTH_SHORT_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Group helper is no longer combined dynamically on each render, using unified state instead

  // Dynamic extraction of all unique business types present in the dataset
  const allUniqueTypes = React.useMemo(() => {
    const types = new Set<string>();
    allProposals.forEach(item => {
      if (item.business_type) {
        types.add(item.business_type);
      }
    });
    return Array.from(types).sort();
  }, [allProposals]);

  const [hasInitializedTypes, setHasInitializedTypes] = useState<boolean>(false);

  useEffect(() => {
    if (allUniqueTypes.length > 0 && !hasInitializedTypes) {
      const initialTypes = allUniqueTypes.filter(t => !t.toLowerCase().includes("renewal"));
      setSelectedTypes(initialTypes);
      setHasInitializedTypes(true);
    }
  }, [allUniqueTypes, hasInitializedTypes]);

  const filteredProposalsForStats = React.useMemo(() => {
    return allProposals.filter(item => {
      const dateStr = dateFilterType === "login" ? item.login_date : item.policy_start_date;
      const parts = dateStr ? dateStr.split("-") : [];
      const month = parts[1]; // e.g. "Apr"
      const year = parts[2];  // e.g. "2026"

      if (selectedMonth !== "ALL" && month !== selectedMonth) {
        return false;
      }
      if (selectedYear !== "ALL" && year !== selectedYear) {
        return false;
      }

      // Filter by Status: if selectedStatuses is not empty, only allow matched statuses
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.proposal_status)) {
        return false;
      }

      // Filter by Business Type: if selectedTypes is not empty, only allow matched types
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.business_type)) {
        return false;
      }

      return true;
    });
  }, [allProposals, selectedMonth, selectedYear, dateFilterType, selectedStatuses, selectedTypes]);

  const filterLabel = React.useMemo(() => {
    const datePart = dateFilterType === "login" ? "LOGIN" : "START";
    const dateText = selectedMonth === "ALL" && selectedYear === "ALL"
      ? "ALL TIME"
      : `${selectedMonth !== "ALL" ? selectedMonth.toUpperCase() : "ALL"} ${selectedYear}`;
    
    return `${datePart}: ${dateText}`;
  }, [dateFilterType, selectedMonth, selectedYear]);

  const handleToggleStatus = (status: string) => {
    const currentList = selectedStatuses.length === 0 ? allUniqueStatuses : selectedStatuses;
    
    if (currentList.includes(status)) {
      const newList = currentList.filter(s => s !== status);
      if (newList.length === 0 || newList.length === allUniqueStatuses.length) {
        setSelectedStatuses([]);
      } else {
        setSelectedStatuses(newList);
      }
    } else {
      const newList = [...currentList, status];
      if (newList.length === allUniqueStatuses.length) {
        setSelectedStatuses([]);
      } else {
        setSelectedStatuses(newList);
      }
    }
  };

  const handleToggleCategory = (categoryKey: string) => {
    const members = categories[categoryKey] || [];
    const currentList = selectedStatuses.length === 0 ? allUniqueStatuses : selectedStatuses;
    
    // Check if ALL members are currently selected
    const allSelected = members.every(m => currentList.includes(m));
    
    let newList: string[];
    if (allSelected) {
      // Unselect all members of this category
      newList = currentList.filter(s => !members.includes(s));
    } else {
      // Select all members of this category
      const toAdd = members.filter(m => !currentList.includes(m));
      newList = [...currentList, ...toAdd];
    }

    if (newList.length === allUniqueStatuses.length || newList.length === 0) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(newList);
    }
  };

  const handleToggleType = (type: string) => {
    const currentList = selectedTypes.length === 0 ? allUniqueTypes : selectedTypes;
    
    if (currentList.includes(type)) {
      const newList = currentList.filter(t => t !== type);
      if (newList.length === 0 || newList.length === allUniqueTypes.length) {
        setSelectedTypes([]);
      } else {
        setSelectedTypes(newList);
      }
    } else {
      const newList = [...currentList, type];
      if (newList.length === allUniqueTypes.length) {
        setSelectedTypes([]);
      } else {
        setSelectedTypes(newList);
      }
    }
  };

  const stats = React.useMemo(() => {
    let total = filteredProposalsForStats.length;
    let inforce = 0;
    let pending = 0;
    let totalPayment = 0;
    let totalGwp = 0;

    filteredProposalsForStats.forEach((item: ProposalRecord) => {
      const status = item.proposal_status?.toLowerCase();
      if (status === "inforce") inforce++;
      else if (status === "pending") pending++;

      totalPayment += Number(item.payment_amount || 0);
      totalGwp += Number(item.gwp || 0);
    });

    return {
      totalProposals: total,
      inforceCount: inforce,
      pendingCount: pending,
      otherCount: total - inforce - pending,
      totalPayment,
      totalGwp
    };
  }, [filteredProposalsForStats]);

  const premiumStats = React.useMemo(() => {
    let totalGwp = 0;
    let totalPayment = 0;
    const members = categories[gwpCardCategory] || [];
    
    filteredProposalsForStats.forEach((item: ProposalRecord) => {
      let match = false;
      if (members.length === 0) {
        match = (item.proposal_status || "").toLowerCase() === gwpCardCategory.toLowerCase();
      } else {
        match = members.includes(item.proposal_status);
      }
      
      if (match) {
        totalGwp += Number(item.gwp || 0);
        totalPayment += Number(item.payment_amount || 0);
      }
    });

    return {
      totalGwp,
      totalPayment
    };
  }, [filteredProposalsForStats, categories, gwpCardCategory]);

  const planProposals = React.useMemo(() => {
    if (!selectedPlanDetailsName) return [];
    const proposalsOfPlan = filteredProposalsForStats.filter(item => item.plan === selectedPlanDetailsName);
    
    if (modalCategoryFilter === "ALL") {
      return proposalsOfPlan;
    }
    
    const members = categories[modalCategoryFilter] || [];
    return proposalsOfPlan.filter(item => {
      if (members.length === 0) {
        return (item.proposal_status || "").toLowerCase() === modalCategoryFilter.toLowerCase();
      }
      return members.includes(item.proposal_status);
    });
  }, [filteredProposalsForStats, selectedPlanDetailsName, modalCategoryFilter, categories]);

  const statsCatProposals = React.useMemo(() => {
    if (!selectedStatsCatModal) return [];
    if (selectedStatsCatModal === "__all__") return filteredProposalsForStats;
    const members = categories[selectedStatsCatModal] || [];
    return filteredProposalsForStats.filter(item => {
      if (members.length === 0) {
        return (item.proposal_status || "").toLowerCase() === selectedStatsCatModal.toLowerCase();
      }
      return members.includes(item.proposal_status);
    });
  }, [filteredProposalsForStats, selectedStatsCatModal, categories]);

  // Analytics: group all proposals by login_date
  const dateAnalytics = React.useMemo(() => {
    const groups: Record<string, ProposalRecord[]> = {};
    filteredProposalsForStats.forEach(item => {
      const d = item.login_date || "Unknown";
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredProposalsForStats]);

  const filteredDateAnalytics = React.useMemo(() => {
    if (!analyticsSearch.trim()) return dateAnalytics;
    const q = analyticsSearch.trim().toLowerCase();
    return dateAnalytics
      .map(([date, rows]) => [
        date,
        rows.filter(r =>
          (r.customer_name || "").toLowerCase().includes(q) ||
          (r.proposal_no || "").toLowerCase().includes(q) ||
          (r.plan || "").toLowerCase().includes(q) ||
          (r.agent_name || "").toLowerCase().includes(q)
        )
      ] as [string, ProposalRecord[]])
      .filter(([, rows]) => rows.length > 0);
  }, [dateAnalytics, analyticsSearch]);

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const planDistribution = React.useMemo(() => {
    const plans: Record<string, number> = {};
    filteredProposalsForStats.forEach((item: ProposalRecord) => {
      if (item.plan) {
        plans[item.plan] = (plans[item.plan] || 0) + 1;
      }
    });
    return Object.entries(plans)
      .sort((a, b) => b[1] - a[1]);
  }, [filteredProposalsForStats]);

  const typeDistribution = React.useMemo(() => {
    const types: Record<string, number> = {};
    filteredProposalsForStats.forEach((item: ProposalRecord) => {
      if (item.business_type) {
        types[item.business_type] = (types[item.business_type] || 0) + 1;
      }
    });
    return Object.entries(types).sort((a, b) => b[1] - a[1]);
  }, [filteredProposalsForStats]);

  interface AgentCodeRecord {
    agent_id: string;
    agent_name: string;
  }
  const [allAgentCodes, setAllAgentCodes] = useState<AgentCodeRecord[]>([]);

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);

  // Group logs by agent_id (agent code) to calculate how many times it was fetched and when it was last fetched
  const agentSummary = React.useMemo(() => {
    const summaryMap: Record<string, {
      agentId: string;
      agentName: string;
      fetchCount: number;
      lastFetch: string | null;
      successCount: number;
      failedCount: number;
    }> = {};

    // 1. Initialize map with ALL known agent codes from agent_codes table
    allAgentCodes.forEach(agent => {
      summaryMap[agent.agent_id] = {
        agentId: agent.agent_id,
        agentName: agent.agent_name || "Unknown Agent",
        fetchCount: 0,
        lastFetch: null,
        successCount: 0,
        failedCount: 0
      };
    });

    // 2. Populate with actual log entries for the selected date
    recentLogs.forEach((log) => {
      const code = log.agent_id;
      if (!code) return; // skip if no agent code is set

      if (!summaryMap[code]) {
        summaryMap[code] = {
          agentId: code,
          agentName: log.agent_name || "Unknown Agent",
          fetchCount: 0,
          lastFetch: log.timestamp,
          successCount: 0,
          failedCount: 0
        };
      }

      const item = summaryMap[code];
      item.fetchCount++;
      
      // Update lastFetch if this log is newer than current lastFetch
      if (!item.lastFetch || new Date(log.timestamp) > new Date(item.lastFetch)) {
        item.lastFetch = log.timestamp;
      }
      
      if (log.status?.toLowerCase() === "success") {
        item.successCount++;
      } else {
        item.failedCount++;
      }
    });

    // 3. Sort: first by fetch count (descending), then alphabetically by name
    return Object.values(summaryMap).sort((a, b) => {
      if (b.fetchCount !== a.fetchCount) {
        return b.fetchCount - a.fetchCount;
      }
      return a.agentName.localeCompare(b.agentName);
    });
  }, [recentLogs, allAgentCodes]);

  // Authenticate user check on mount
  useEffect(() => {
    const session = localStorage.getItem("tfc_user_session");
    if (!session) {
      const getDynamicKey = () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yy = String(today.getFullYear()).slice(-2);
        const dateStr = `${yy}${mm}${dd}`;
        const map = ["X", "m", "8", "P", "q", "Z", "v", "2", "y", "K"];
        const obfuscated = dateStr.split("").map(d => map[parseInt(d)]).join("");
        return `TFC${obfuscated}SECURE`;
      };
      const key = getDynamicKey();
      const timestamp = Math.floor(Date.now() / 1000);
      const obfTime = btoa(timestamp.toString());
      router.push(`/login?tfc_key=${key}&tfc_time=${obfTime}`);
    } else {
      setCurrentUser(JSON.parse(session));
      fetchDashboardData();
    }
  }, [router]);

  // Fetch logs whenever selectedDate changes
  useEffect(() => {
    if (currentUser) {
      fetchLogsForDate(selectedDate);
    }
  }, [selectedDate, currentUser]);

  const fetchLogsForDate = async (dateStr: string) => {
    try {
      const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString();

      const { data: logs, error: logsError } = await supabase
        .from("faveo_logs")
        .select("id, agent_id, agent_name, status, total_records, uploaded_records, error_message, timestamp")
        .gte("timestamp", startOfDay)
        .lte("timestamp", endOfDay)
        .order("timestamp", { ascending: false });

      if (logsError) throw logsError;
      setRecentLogs(logs || []);
    } catch (e) {
      console.error("Error fetching logs for date:", e);
    }
  };

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch proposals (handling PostgREST 1000 row cap)
      let proposals: ProposalRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: propData, error: propError } = await supabase
          .from("faveo_data")
          .select("proposal_no, customer_name, policy_no, plan, proposal_status, payment_amount, gwp, login_date, policy_start_date, no_of_lives, business_type, agent_name, updated_at")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (propError) throw propError;

        if (propData && propData.length > 0) {
          proposals = [...proposals, ...propData];
          if (propData.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      // 2. Fetch logs for the selected date
      await fetchLogsForDate(selectedDate);

      // Fetch all agent codes
      const { data: agentsData, error: agentsError } = await supabase
        .from("agent_codes")
        .select("agent_id, agent_name");

      if (agentsError) throw agentsError;
      if (agentsData) {
        setAllAgentCodes(agentsData);
      }

      if (proposals) {
        setAllProposals(proposals);
      }
    } catch (e) {
      console.error("Error loading dashboard metrics:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tfc_user_session");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="db-loading-container">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
        <p style={{ marginTop: "1rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em" }}>
          INITIALIZING CONTROL PANEL DASHBOARD...
        </p>
        <style jsx>{`
          .db-loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            color: var(--white);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* RETRO GLOW/SHADOW STYLING SPECIFIC TO DASHBOARD */}
      <style jsx global>{`
        .dashboard-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Space Mono', monospace;
          color: var(--white);
        }

        .db-header {
          border: 4px solid var(--white);
          background: repeating-linear-gradient(45deg, #0f0f0f, #0f0f0f 10px, #1a1a1a 10px, #1a1a1a 20px);
          box-shadow: 8px 8px 0px var(--white);
          padding: 1.5rem 2rem;
          margin-bottom: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .db-title-area h1 {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          text-shadow: 2px 2px 0px #555;
          margin-bottom: 0.2rem;
        }

        .db-title-area p {
          color: #888;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
        }

        .db-header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .db-user-badge {
          border: 2px solid var(--white);
          background-color: var(--black);
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .db-action-btn {
          background-color: var(--black);
          color: var(--white);
          border: 2px solid var(--white);
          padding: 0.5rem 1rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .db-action-btn:hover {
          background-color: var(--white);
          color: var(--black);
          transform: translate(-2px, -2px);
          box-shadow: 2px 2px 0px var(--white);
        }

        .db-logout-btn {
          border-color: #ff4444;
          color: #ff4444;
        }

        .db-logout-btn:hover {
          background-color: #ff4444;
          color: var(--black);
          border-color: #ff4444;
          box-shadow: 2px 2px 0px #ff4444;
        }

        /* STATS GRID */
        .db-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .db-stat-card {
          border: 3px solid var(--white);
          background-color: var(--black);
          padding: 1.5rem;
          box-shadow: 6px 6px 0px var(--white);
          transition: all 0.2s ease;
          position: relative;
          overflow: visible;
          z-index: 1;
        }

        .db-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 10px 10px 0px var(--white);
          z-index: 100;
        }

        .db-stat-icon {
          position: absolute;
          right: 1rem;
          top: 1rem;
          opacity: 0.15;
          color: var(--white);
        }

        .db-stat-label {
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        .db-stat-val {
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 0.3rem;
        }

        .db-stat-footer {
          font-size: 0.7rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* CONTENT COLUMNS */
        .db-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin-bottom: 2.5rem;
        }

        @media (max-width: 900px) {
          .db-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .db-panel {
          border: 4px solid var(--white);
          background-color: var(--black);
          padding: 1.8rem;
          box-shadow: 8px 8px 0px var(--white);
        }

        .db-panel-header {
          border-bottom: 2px solid var(--white);
          padding-bottom: 0.8rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .db-panel-title {
          font-size: 1.1rem;
          font-weight: bold;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* METERS & BARS */
        .db-bar-item {
          margin-bottom: 1.2rem;
        }

        .db-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-bottom: 0.4rem;
        }

        .db-bar-track {
          height: 12px;
          background-color: #222;
          border: 1px solid var(--white);
          position: relative;
        }

        .db-bar-fill {
          height: 100%;
          background-color: var(--white);
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* LOG TABLE */
        .db-log-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          max-height: 385px;
          overflow-y: auto;
          padding-right: 0.3rem;
        }

        .db-log-item {
          border: 1px solid #333;
          padding: 0.8rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .db-log-left {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .db-log-agent {
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-log-meta {
          color: #666;
          font-size: 0.7rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-status-tag {
          font-size: 0.65rem;
          padding: 0.2rem 0.5rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .db-status-success {
          background-color: rgba(0, 200, 81, 0.15);
          color: #00c851;
          border: 1px solid #00c851;
        }

        .db-status-failed {
          background-color: rgba(255, 68, 68, 0.15);
          color: #ff4444;
          border: 1px solid #ff4444;
        }

        /* DISTRIBUTION ROW */
        .db-dist-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .db-dist-box {
          border: 2px solid #333;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .db-dist-name {
          font-size: 0.8rem;
          font-weight: bold;
        }

        .db-dist-count {
          font-size: 1.2rem;
          font-weight: bold;
          border-left: 2px solid #333;
          padding-left: 0.8rem;
        }

        /* SPIN ANIMATION */
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* HEADER BLOCK */}
      <header className="db-header">
        <div className="db-title-area">
          <h1>DASHBOARD CONTROL</h1>
          <p>THE FINANCIAL CRAFT &bull; ADMIN CONTROL PANEL &bull; SYSTEM OVERVIEW</p>
        </div>
        <div className="db-header-actions">
          {currentUser && (
            <div className="db-user-badge">
              <User size={14} />
              <span>
                {currentUser.user_name || currentUser.employee_id} ({currentUser.role || "Admin"})
              </span>
            </div>
          )}
          <button onClick={fetchDashboardData} className="db-action-btn" title="Refresh Dashboard" disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            REFRESH
          </button>
          <button onClick={handleLogout} className="db-action-btn db-logout-btn" title="Logout from System">
            <LogOut size={14} />
            LOGOUT
          </button>
        </div>
      </header>

      {/* TAB BAR */}
      <div style={{ display: "flex", gap: "0", borderBottom: "3px solid #fff", marginTop: "2rem", marginBottom: "0" }}>
        {(["dashboard", "analytics"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "#fff" : "none",
              color: activeTab === tab ? "#000" : "#888",
              border: "none",
              borderRight: "3px solid #fff",
              padding: "0.6rem 1.5rem",
              fontFamily: "'Space Mono', monospace",
              fontWeight: "bold",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {tab === "dashboard" ? "⬛ DASHBOARD" : "📊 ANALYTICS"}
          </button>
        ))}
      </div>

      {/* SECTION ACTION BAR */}
      {activeTab === "dashboard" && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: "bold", letterSpacing: "0.05em", color: "#fff", textTransform: "uppercase", margin: 0 }}>
          KEY METRICS
        </h2>
        <button
          type="button"
          className="db-action-btn"
          onClick={() => {
            setIsCreatingStatCard(true);
            setNewStatCardName("");
            setNewStatCardCategory(Object.keys(categories)[0] || "");
          }}
          style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
        >
          + CREATE NEW STATS CARD
        </button>
      </div>
      )}

      {/* METRIC CARD GRID */}
      {activeTab === "dashboard" && (
      <section className="db-stats-grid">
        {/* CARD 1: Total Proposals */}
        <div className="db-stat-card">
          <Database className="db-stat-icon" size={48} />
          <div className="db-stat-label">Total Proposals</div>
          <div
            className="db-stat-val"
            style={{ cursor: "pointer" }}
            title="Click to view all proposals"
            onClick={() => {
              setStatsCatModalTitle("Total Proposals");
              setSelectedStatsCatModal("__all__");
            }}
          >{stats.totalProposals}</div>
          <div className="db-stat-footer">
            <Activity size={12} /> Live synchronized records
          </div>
        </div>

        {/* CARD 2: Inforce / Custom Category */}
        <div
          className="db-stat-card"
          style={{ borderColor: "#00c851", position: "relative" }}
        >
          {/* EDIT BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowInforceEditDropdown(prev => !prev);
              setShowPendingEditDropdown(false);
              setShowGwpEditDropdown(false);
            }}
            className="stat-edit-btn"
            style={{ color: "#00c851" }}
            title="Choose Status Category"
          >
            <Edit2 size={14} />
          </button>

          {/* EDIT DROPDOWN */}
          {showInforceEditDropdown && (
            <div
              className="card-edit-dropdown"
              style={{ borderColor: "#00c851", boxShadow: "4px 4px 0px #00c851" }}
              onClick={(e) => e.stopPropagation()}
            >
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className="card-edit-option"
                  onClick={() => {
                    setInforceCardCategory(cat);
                    localStorage.setItem("tfc_inforce_card_cat", cat);
                    setShowInforceEditDropdown(false);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <CheckCircle className="db-stat-icon" size={48} style={{ color: "#00c851" }} />
          <div className="db-stat-label">{inforceCardCategory.toUpperCase()} STATUS</div>
          <div
            className="db-stat-val"
            style={{ color: "#00c851", cursor: "pointer" }}
            title="Click to view proposals"
            onClick={() => {
              setStatsCatModalTitle(`${inforceCardCategory.toUpperCase()} STATUS`);
              setSelectedStatsCatModal(inforceCardCategory);
            }}
          >{getCategoryCount(inforceCardCategory)}</div>
          <div className="db-stat-footer" style={{ color: "#00c851" }}>
            {stats.totalProposals > 0
              ? `${((getCategoryCount(inforceCardCategory) / stats.totalProposals) * 100).toFixed(1)}%`
              : "0%"} of directory size
          </div>
        </div>

        {/* CARD 3: Pending / Custom Category */}
        <div
          className="db-stat-card"
          style={{ borderColor: "#ffbb00", position: "relative" }}
        >
          {/* EDIT BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPendingEditDropdown(prev => !prev);
              setShowInforceEditDropdown(false);
              setShowGwpEditDropdown(false);
            }}
            className="stat-edit-btn"
            style={{ color: "#ffbb00" }}
            title="Choose Status Category"
          >
            <Edit2 size={14} />
          </button>

          {/* EDIT DROPDOWN */}
          {showPendingEditDropdown && (
            <div
              className="card-edit-dropdown"
              style={{ borderColor: "#ffbb00", boxShadow: "4px 4px 0px #ffbb00" }}
              onClick={(e) => e.stopPropagation()}
            >
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className="card-edit-option"
                  onClick={() => {
                    setPendingCardCategory(cat);
                    localStorage.setItem("tfc_pending_card_cat", cat);
                    setShowPendingEditDropdown(false);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <Clock className="db-stat-icon" size={48} style={{ color: "#ffbb00" }} />
          <div className="db-stat-label">{pendingCardCategory.toUpperCase()} STATUS</div>
          <div
            className="db-stat-val"
            style={{ color: "#ffbb00", cursor: "pointer" }}
            title="Click to view proposals"
            onClick={() => {
              setStatsCatModalTitle(`${pendingCardCategory.toUpperCase()} STATUS`);
              setSelectedStatsCatModal(pendingCardCategory);
            }}
          >{getCategoryCount(pendingCardCategory)}</div>
          <div className="db-stat-footer" style={{ color: "#ffbb00" }}>
            {stats.totalProposals > 0
              ? `${((getCategoryCount(pendingCardCategory) / stats.totalProposals) * 100).toFixed(1)}%`
              : "0%"} active pipeline
          </div>
        </div>

        {/* CARD 4: GWP / Net Premium Switch */}
        <div
          className="db-stat-card"
          style={{ borderColor: "#33b5e5", position: "relative" }}
        >
          {/* EDIT BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGwpEditDropdown(prev => !prev);
              setShowInforceEditDropdown(false);
              setShowPendingEditDropdown(false);
            }}
            className="stat-edit-btn"
            style={{ color: "#33b5e5" }}
            title="Switch Premium Type"
          >
            <Edit2 size={14} />
          </button>

          {/* EDIT DROPDOWN */}
          {showGwpEditDropdown && (
            <div
              className="card-edit-dropdown"
              style={{ borderColor: "#33b5e5", boxShadow: "4px 4px 0px #33b5e5", minWidth: "180px", padding: "0.4rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: "0.6rem", color: "#888", fontWeight: "bold", padding: "0.2rem 0.6rem", textTransform: "uppercase" }}>Premium Mode</span>
              <button
                type="button"
                className="card-edit-option"
                style={{ fontWeight: gwpCardMode === "gwp" ? "bold" : "normal", color: gwpCardMode === "gwp" ? "#33b5e5" : "#fff" }}
                onClick={() => {
                  setGwpCardMode("gwp");
                  localStorage.setItem("tfc_gwp_card_mode", "gwp");
                }}
              >
                GWP (Gross Premium)
              </button>
              <button
                type="button"
                className="card-edit-option"
                style={{ fontWeight: gwpCardMode === "net" ? "bold" : "normal", color: gwpCardMode === "net" ? "#33b5e5" : "#fff" }}
                onClick={() => {
                  setGwpCardMode("net");
                  localStorage.setItem("tfc_gwp_card_mode", "net");
                }}
              >
                Net Premium
              </button>
              
              <div style={{ borderTop: "1px dashed #333", margin: "0.4rem 0" }} />
              
              <span style={{ fontSize: "0.6rem", color: "#888", fontWeight: "bold", padding: "0.2rem 0.6rem", textTransform: "uppercase" }}>Filter Status Category</span>
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className="card-edit-option"
                  style={{ fontWeight: gwpCardCategory === cat ? "bold" : "normal", color: gwpCardCategory === cat ? "#33b5e5" : "#fff" }}
                  onClick={() => {
                    setGwpCardCategory(cat);
                    localStorage.setItem("tfc_gwp_card_cat", cat);
                    setShowGwpEditDropdown(false);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}


          <DollarSign className="db-stat-icon" size={48} style={{ color: "#33b5e5" }} />
          <div className="db-stat-label">
            {gwpCardMode === "gwp" ? "GWP Collected" : "Net Premium"}
          </div>
          <div
            className="db-stat-val"
            style={{ color: "#33b5e5", cursor: "pointer" }}
            title="Click to view proposals"
            onClick={() => {
              setStatsCatModalTitle(`${gwpCardMode === "gwp" ? "GWP" : "NET PREMIUM"} — ${gwpCardCategory.toUpperCase()}`);
              setSelectedStatsCatModal(gwpCardCategory);
            }}
          >
            ₹{Math.round((gwpCardMode === "gwp" ? premiumStats.totalGwp : premiumStats.totalPayment) / 100000)}L
          </div>
          <div className="db-stat-footer" style={{ color: "#33b5e5" }}>
            Total ({gwpCardCategory.toUpperCase()}): ₹{(gwpCardMode === "gwp" ? premiumStats.totalGwp : premiumStats.totalPayment).toLocaleString()}
          </div>
        </div>

        {/* CUSTOM METRIC CARDS */}
        {customCards.map(card => {
          const count = getCategoryCount(card.category);
          const percentage = stats.totalProposals > 0
            ? ((count / stats.totalProposals) * 100).toFixed(1)
            : "0";
          return (
            <div
              key={card.id}
              className="db-stat-card"
              style={{ borderColor: "#a66bbe", position: "relative" }}
            >
              {/* DELETE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  const updated = customCards.filter(c => c.id !== card.id);
                  setCustomCards(updated);
                  localStorage.setItem("tfc_custom_stat_cards", JSON.stringify(updated));
                }}
                style={{
                  position: "absolute",
                  top: "0.6rem",
                  right: "0.6rem",
                  background: "none",
                  border: "none",
                  color: "#ff4444",
                  cursor: "pointer",
                  padding: 0
                }}
                title="Delete Metric Card"
              >
                <X size={14} />
              </button>

              <BarChart3 className="db-stat-icon" size={48} style={{ color: "#a66bbe" }} />
              <div className="db-stat-label">{card.name}</div>
              <div
                className="db-stat-val"
                style={{ color: "#a66bbe", cursor: "pointer" }}
                title="Click to view proposals"
                onClick={() => {
                  setStatsCatModalTitle(card.name);
                  setSelectedStatsCatModal(card.category);
                }}
              >{count}</div>
              <div className="db-stat-footer" style={{ color: "#a66bbe" }}>
                {percentage}% of total ({card.category.toUpperCase()})
              </div>
            </div>
          );
        })}
      </section>
      )}

      {/* ANALYTICS TAB CONTENT */}
      {activeTab === "analytics" && (
        <div style={{ marginTop: "2rem", fontFamily: "'Space Mono', monospace" }}>
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", textTransform: "uppercase", margin: 0 }}>
                📅 DATE-WISE BOOKING ANALYTICS
              </h2>
              <p style={{ fontSize: "0.7rem", color: "#666", margin: "0.3rem 0 0" }}>
                {filteredDateAnalytics.length} DATES &bull; {filteredProposalsForStats.length} TOTAL PROPOSALS
              </p>
            </div>
            <input
              type="text"
              placeholder="Search proposal / customer / plan / agent..."
              value={analyticsSearch}
              onChange={e => setAnalyticsSearch(e.target.value)}
              style={{
                background: "#000",
                border: "2px solid #444",
                color: "#fff",
                padding: "0.4rem 0.8rem",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.72rem",
                outline: "none",
                width: "280px"
              }}
            />
          </div>

          {/* EXPAND ALL / COLLAPSE ALL */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              type="button"
              className="db-action-btn"
              style={{ fontSize: "0.68rem", padding: "0.3rem 0.8rem" }}
              onClick={() => setExpandedDates(new Set(filteredDateAnalytics.map(([d]) => d)))}
            >EXPAND ALL</button>
            <button
              type="button"
              className="db-action-btn"
              style={{ fontSize: "0.68rem", padding: "0.3rem 0.8rem" }}
              onClick={() => setExpandedDates(new Set())}
            >COLLAPSE ALL</button>
          </div>

          {/* DATE ROWS */}
          {filteredDateAnalytics.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#555", border: "2px dashed #333" }}>
              NO PROPOSALS FOUND FOR CURRENT FILTERS.
            </div>
          ) : (
            filteredDateAnalytics.map(([date, rows]) => {
              const isExpanded = expandedDates.has(date);
              // Count per plan
              const planCount: Record<string, number> = {};
              rows.forEach(r => { const p = r.plan || "Unknown"; planCount[p] = (planCount[p] || 0) + 1; });

              return (
                <div key={date} style={{ marginBottom: "0.6rem", border: "2px solid #333" }}>
                  {/* DATE HEADER ROW */}
                  <div
                    onClick={() => toggleDateExpand(date)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.7rem 1rem",
                      cursor: "pointer",
                      backgroundColor: isExpanded ? "#111" : "#000",
                      borderBottom: isExpanded ? "2px solid #333" : "none",
                      transition: "background-color 0.15s ease",
                      flexWrap: "wrap",
                      gap: "0.5rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff", minWidth: "110px" }}>
                        {date}
                      </span>
                      <span style={{ fontSize: "0.7rem", background: "#fff", color: "#000", padding: "0.15rem 0.5rem", fontWeight: "bold" }}>
                        {rows.length} PROPOSALS
                      </span>
                      {/* PLAN TAGS */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        {Object.entries(planCount).slice(0, 4).map(([plan, cnt]) => (
                          <span key={plan} style={{ fontSize: "0.6rem", border: "1px solid #555", padding: "0.1rem 0.4rem", color: "#aaa" }}>
                            {plan} &times;{cnt}
                          </span>
                        ))}
                        {Object.keys(planCount).length > 4 && (
                          <span style={{ fontSize: "0.6rem", color: "#666" }}>+{Object.keys(planCount).length - 4} more</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#666", userSelect: "none" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* EXPANDABLE PROPOSAL TABLE */}
                  {isExpanded && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", color: "#fff" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#0a0a0a", borderBottom: "1px solid #333" }}>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>#</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>PROPOSAL NO</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>CUSTOMER</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>PLAN</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>STATUS</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>PAYMENT (₹)</th>
                            <th style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #222", color: "#888", fontWeight: "bold", textAlign: "left" }}>GWP (₹)</th>
                            <th style={{ padding: "0.4rem 0.8rem", color: "#888", fontWeight: "bold", textAlign: "left" }}>AGENT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((item, i) => (
                            <tr key={item.proposal_no || i} style={{ borderBottom: "1px solid #1a1a1a", backgroundColor: i % 2 === 0 ? "#000" : "#050505" }}>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a", color: "#555" }}>{i + 1}</td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a" }}><code style={{ fontSize: "0.7rem" }}>{item.proposal_no || "-"}</code></td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a", fontWeight: "bold" }}>{item.customer_name || "-"}</td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a", color: "#aaa" }}>{item.plan || "-"}</td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a" }}>
                                <span className={`status-badge ${
                                  item.proposal_status?.toLowerCase() === "inforce" ? "status-inforce" :
                                  item.proposal_status?.toLowerCase() === "pending" ? "status-pending" : "status-other"
                                }`} style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}>
                                  {item.proposal_status || "-"}
                                </span>
                              </td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a", color: "#33b5e5" }}>
                                {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                              </td>
                              <td style={{ padding: "0.4rem 0.8rem", borderRight: "1px solid #1a1a1a", color: "#00c851" }}>
                                {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                              </td>
                              <td style={{ padding: "0.4rem 0.8rem", color: "#888" }}>{item.agent_name || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "dashboard" && (
      <div className="db-main-grid">
        <div className="db-panel">
          <div className="db-panel-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.8rem" }}>
            <h2 className="db-panel-title">
              <Layers size={18} />
              BUSINESS TYPE DISTRIBUTION
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", width: "100%", flexWrap: "wrap" }}>
              {/* MONTH YEAR SELECTOR TRIGGER BUTTON */}
              <button
                onClick={() => {
                  setShowMonthYearPicker(prev => !prev);
                  setShowStatusPicker(false);
                  setShowTypePicker(false);
                }}
                className="db-action-btn"
                title="Filter by Month/Year"
                style={{ padding: "0.3rem 0.5rem", flexGrow: 1, justifyContent: "center" }}
              >
                <Calendar size={14} />
                <span>{filterLabel}</span>
              </button>

              {/* MONTH YEAR PICKER DROPDOWN */}
              {showMonthYearPicker && (
                <div className="filter-dropdown-popup calendar-popup" style={{ left: 0, top: "110%", minWidth: "190px", zIndex: 1000 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", padding: "0.5rem" }}>
                    {/* LOGIN OR START DATE TOGGLE */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <label style={{ fontSize: "0.65rem", color: "#888", fontWeight: "bold" }}>FILTER DATE BY</label>
                      <div style={{ display: "flex", border: "2px solid #fff" }}>
                        <button
                          type="button"
                          onClick={() => setDateFilterType("login")}
                          style={{
                            flex: 1,
                            padding: "0.4rem",
                            fontSize: "0.7rem",
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: "bold",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: dateFilterType === "login" ? "#fff" : "#000",
                            color: dateFilterType === "login" ? "#000" : "#fff",
                            transition: "all 0.2s"
                          }}
                        >
                          LOGIN
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFilterType("start")}
                          style={{
                            flex: 1,
                            padding: "0.4rem",
                            fontSize: "0.7rem",
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: "bold",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: dateFilterType === "start" ? "#fff" : "#000",
                            color: dateFilterType === "start" ? "#000" : "#fff",
                            transition: "all 0.2s"
                          }}
                        >
                          START
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <label style={{ fontSize: "0.65rem", color: "#888", fontWeight: "bold" }}>MONTH</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ width: "100%", padding: "0.3rem", backgroundColor: "#000", color: "#fff", border: "2px solid #fff", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", outline: "none" }}
                      >
                        <option value="ALL">ALL MONTHS</option>
                        {MONTH_SHORT_NAMES.map(m => (
                          <option key={m} value={m}>{m.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <label style={{ fontSize: "0.65rem", color: "#888", fontWeight: "bold" }}>YEAR</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ width: "100%", padding: "0.3rem", backgroundColor: "#000", color: "#fff", border: "2px solid #fff", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", outline: "none" }}
                      >
                        <option value="ALL">ALL YEARS</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setShowMonthYearPicker(false)}
                      className="db-action-btn"
                      style={{ width: "100%", justifyContent: "center", fontSize: "0.75rem" }}
                    >
                      APPLY
                    </button>
                  </div>
                </div>
              )}

              {/* STATUS FILTER TRIGGER BUTTON */}
              <button
                onClick={() => {
                  setShowStatusPicker(prev => !prev);
                  setShowMonthYearPicker(false);
                  setShowTypePicker(false);
                }}
                className="db-action-btn"
                title="Filter by Proposal Status"
                style={{ padding: "0.3rem 0.5rem", flexGrow: 1, justifyContent: "center" }}
              >
                <Database size={14} />
                <span>
                  STATUS: {selectedStatuses.length === 0 ? "ALL" : `${selectedStatuses.length} SEL`}
                </span>
              </button>

              {/* STATUS PICKER DROPDOWN */}
              {showStatusPicker && (
                <div className="filter-dropdown-popup calendar-popup" style={{ left: 0, top: "110%", minWidth: "270px", zIndex: 1000 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", padding: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed #333", paddingBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: "bold" }}>STATUS FILTER</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={handleRestoreDefaults}
                          style={{ background: "none", border: "none", color: "#ffbb00", fontSize: "0.65rem", fontWeight: "bold", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
                          title="Restore pre-built status categories"
                        >
                          RESTORE DEFAULTS
                        </button>
                        <span style={{ color: "#333" }}>|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStatuses([])}
                          style={{ background: "none", border: "none", color: "#33b5e5", fontSize: "0.65rem", fontWeight: "bold", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
                        >
                          RESET ALL
                        </button>
                      </div>
                    </div>

                     {/* CATEGORIES SELECTION */}
                     <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                       <span style={{ fontSize: "0.65rem", color: "#888", fontWeight: "bold", letterSpacing: "0.05em" }}>CATEGORIES</span>
                       <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                         {Object.keys(categories).map(cat => {
                           const members = categories[cat] || [];
                           const currentList = selectedStatuses.length === 0 ? allUniqueStatuses : selectedStatuses;
                           const isCatChecked = members.length > 0 && members.every(m => currentList.includes(m));
                           const isExpanded = expandedRawStatusesCatKey === cat;

                           return (
                             <div
                               key={cat}
                               style={{
                                 display: "flex",
                                 flexDirection: "column",
                                 gap: "0.2rem",
                                 border: "1px solid #333",
                                 padding: "0.25rem 0.4rem",
                                 backgroundColor: isCatChecked ? "rgba(255,255,255,0.05)" : "transparent"
                               }}
                             >
                               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                 <label
                                   style={{
                                     display: "flex",
                                     alignItems: "center",
                                     gap: "0.4rem",
                                     fontSize: "0.7rem",
                                     cursor: "pointer",
                                     textTransform: "uppercase",
                                     flexGrow: 1
                                   }}
                                 >
                                   <input
                                     type="checkbox"
                                     checked={isCatChecked}
                                     onChange={() => handleToggleCategory(cat)}
                                     style={{ accentColor: "#fff", cursor: "pointer" }}
                                   />
                                   <span style={{ fontWeight: "bold" }}>{cat}</span>
                                 </label>

                                 <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                   {/* SHOW RAW STATUSES TOGGLE */}
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setExpandedRawStatusesCatKey(isExpanded ? null : cat);
                                     }}
                                     style={{
                                       background: "none",
                                       border: "none",
                                       color: isExpanded ? "#ffbb00" : "#888",
                                       cursor: "pointer",
                                       display: "flex",
                                       alignItems: "center",
                                       padding: 0
                                     }}
                                     title={isExpanded ? "Hide Raw Statuses" : "Show Raw Statuses"}
                                   >
                                     <Eye size={10} />
                                   </button>

                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleEditCategory(cat);
                                     }}
                                     style={{
                                       background: "none",
                                       border: "none",
                                       color: "#33b5e5",
                                       cursor: "pointer",
                                       display: "flex",
                                       alignItems: "center",
                                       padding: 0
                                     }}
                                     title="Edit Category"
                                   >
                                     <Edit2 size={10} />
                                   </button>
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const updated = { ...categories };
                                       delete updated[cat];
                                       saveCategories(updated);
                                       if (expandedRawStatusesCatKey === cat) {
                                         setExpandedRawStatusesCatKey(null);
                                       }
                                     }}
                                     style={{
                                       background: "none",
                                       border: "none",
                                       color: "#ff4444",
                                       cursor: "pointer",
                                       display: "flex",
                                       alignItems: "center",
                                       padding: 0
                                     }}
                                     title="Delete Category"
                                   >
                                     <X size={10} />
                                   </button>
                                 </div>
                               </div>

                               {/* NESTED RAW STATUS LIST */}
                               {isExpanded && (
                                 <div style={{
                                   display: "flex",
                                   flexDirection: "column",
                                   gap: "0.3rem",
                                   padding: "0.3rem 0 0.2rem 1.1rem",
                                   borderTop: "1px dashed #222",
                                   marginTop: "0.25rem"
                                 }}>
                                   <span style={{ fontSize: "0.55rem", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Raw Statuses ({members.length})</span>
                                   {members.length === 0 ? (
                                     <span style={{ fontSize: "0.6rem", color: "#444", fontStyle: "italic" }}>No statuses mapped</span>
                                   ) : (
                                     members.map(status => {
                                       const isChecked = selectedStatuses.length === 0 || selectedStatuses.includes(status);
                                       return (
                                         <label
                                           key={status}
                                           style={{
                                             display: "flex",
                                             alignItems: "center",
                                             gap: "0.4rem",
                                             fontSize: "0.6rem",
                                             cursor: "pointer",
                                             textTransform: "uppercase",
                                             opacity: isChecked ? 1 : 0.5
                                           }}
                                         >
                                           <input
                                             type="checkbox"
                                             checked={isChecked}
                                             onChange={() => handleToggleStatus(status)}
                                             style={{ accentColor: "#fff", cursor: "pointer", width: "10px", height: "10px" }}
                                           />
                                           <span style={{ wordBreak: "break-all" }}>{status}</span>
                                         </label>
                                       );
                                     })
                                   )}
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </div>

                     {/* DYNAMIC CATEGORY CREATOR TRIGGER BUTTON & ALL RAW STATUSES BUTTON */}
                     <div style={{ display: "flex", gap: "0.4rem", borderTop: "1px dashed #333", paddingTop: "0.5rem" }}>
                       <button
                         type="button"
                         className="db-action-btn"
                         style={{ flex: 1, justifyContent: "center", fontSize: "0.6rem", padding: "0.3rem 0.2rem" }}
                         onClick={() => {
                           setIsCreatingCategory(true);
                           setEditingCategoryKey(null);
                           setNewCatName("");
                           setNewCatStatuses([]);
                         }}
                       >
                         + CREATE CATEGORY
                       </button>
                       <button
                         type="button"
                         className="db-action-btn"
                         style={{ flex: 1, justifyContent: "center", fontSize: "0.6rem", padding: "0.3rem 0.2rem", borderColor: showAllRawStatuses ? "#ffbb00" : "#fff", color: showAllRawStatuses ? "#ffbb00" : "#fff" }}
                         onClick={() => setShowAllRawStatuses(prev => !prev)}
                       >
                         {showAllRawStatuses ? "HIDE RAW" : "ALL RAW STATUSES"}
                       </button>
                     </div>

                     {/* GLOBAL RAW STATUSES SELECTION */}
                     {showAllRawStatuses && (
                       <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px dashed #333", paddingTop: "0.6rem" }}>
                         <span style={{ fontSize: "0.65rem", color: "#888", fontWeight: "bold", letterSpacing: "0.05em" }}>ALL RAW STATUSES</span>
                         <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "180px", overflowY: "auto", paddingRight: "0.25rem" }}>
                           {allUniqueStatuses.map(status => {
                             const isChecked = selectedStatuses.length === 0 || selectedStatuses.includes(status);
                             return (
                               <label
                                 key={status}
                                 style={{
                                   display: "flex",
                                   alignItems: "center",
                                   gap: "0.5rem",
                                   fontSize: "0.65rem",
                                   cursor: "pointer",
                                   textTransform: "uppercase",
                                   opacity: isChecked ? 1 : 0.5
                                 }}
                               >
                                 <input
                                   type="checkbox"
                                   checked={isChecked}
                                   onChange={() => handleToggleStatus(status)}
                                   style={{
                                     accentColor: "#fff",
                                     cursor: "pointer"
                                   }}
                                 />
                                 <span style={{ wordBreak: "break-all" }}>{status}</span>
                               </label>
                             );
                           })}
                         </div>
                       </div>
                     )}

                     <button
                       onClick={() => setShowStatusPicker(false)}
                       className="db-action-btn"
                       style={{ width: "100%", justifyContent: "center", fontSize: "0.75rem" }}
                     >
                       APPLY
                     </button>
                   </div>
                 </div>
               )}

              {/* TYPE FILTER TRIGGER BUTTON */}
              <button
                onClick={() => {
                  setShowTypePicker(prev => !prev);
                  setShowMonthYearPicker(false);
                  setShowStatusPicker(false);
                }}
                className="db-action-btn"
                title="Filter by Business Type"
                style={{ padding: "0.3rem 0.5rem", flexGrow: 1, justifyContent: "center" }}
              >
                <Layers size={14} />
                <span>
                  TYPE: {selectedTypes.length === 0 ? "ALL" : `${selectedTypes.length} SEL`}
                </span>
              </button>

              {/* TYPE PICKER DROPDOWN */}
              {showTypePicker && (
                <div className="filter-dropdown-popup calendar-popup" style={{ left: 0, top: "110%", minWidth: "200px", zIndex: 1000 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", padding: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed #333", paddingBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: "bold" }}>BUSINESS TYPES</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTypes([])}
                        style={{ background: "none", border: "none", color: "#33b5e5", fontSize: "0.65rem", fontWeight: "bold", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
                      >
                        RESET ALL
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "180px", overflowY: "auto", paddingRight: "0.25rem" }}>
                      {allUniqueTypes.map(type => {
                        const isChecked = selectedTypes.length === 0 || selectedTypes.includes(type);
                        return (
                          <label
                            key={type}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              textTransform: "uppercase"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleType(type)}
                              style={{
                                accentColor: "#fff",
                                cursor: "pointer"
                              }}
                            />
                            <span style={{ wordBreak: "break-all", fontSize: "0.65rem" }}>{type}</span>
                          </label>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setShowTypePicker(false)}
                      className="db-action-btn"
                      style={{ width: "100%", justifyContent: "center", fontSize: "0.75rem" }}
                    >
                      APPLY
                    </button>
                  </div>
                </div>
              )}

              <Link href="/" className="db-action-btn" style={{ textDecoration: "none", padding: "0.3rem 0.5rem", flexGrow: 1, justifyContent: "center" }}>
                <List size={14} /> VIEW DIRECTORY <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="db-dist-row" style={{ marginBottom: "2.5rem" }}>
            {typeDistribution.map(([name, count]) => (
              <div key={name} className="db-dist-box">
                <span className="db-dist-name">{name}</span>
                <span className="db-dist-count">{count}</span>
              </div>
            ))}
          </div>

          <div className="db-panel-header" style={{ borderTop: "2px solid var(--white)", paddingTop: "1.5rem" }}>
            <h2 className="db-panel-title">
              <BarChart3 size={18} />
              ALL INSURANCE PLANS
            </h2>
          </div>

          <div style={{ marginBottom: "0.5rem", maxHeight: "350px", overflowY: "auto", paddingRight: "0.25rem" }}>
            {planDistribution.map(([name, count]) => {
              const percentage = stats.totalProposals > 0 ? (count / stats.totalProposals) * 100 : 0;
              return (
                <div
                  key={name}
                  className="db-bar-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedPlanDetailsName(name)}
                  title="Click to view directory rows matching this plan"
                >
                  <div className="db-bar-labels">
                    <span style={{ fontWeight: "bold" }}>{name}</span>
                    <span>{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="db-bar-track">
                    <div
                      className="db-bar-fill"
                      style={{ width: `${percentage}%`, backgroundColor: "var(--white)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT LOGS */}
        <div className="db-panel">
          <div className="db-panel-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.8rem" }}>
            <h2 className="db-panel-title">
              <Activity size={18} />
              RECENT FETCH LOGS
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", width: "100%" }}>
              <button
                onClick={() => setShowDatePicker(prev => !prev)}
                className="db-action-btn"
                title="Select Date"
                style={{ padding: "0.3rem 0.5rem", flexGrow: 1, justifyContent: "center" }}
              >
                <Calendar size={14} />
                <span>{selectedDate}</span>
              </button>

              {showDatePicker && (
                <div className="filter-dropdown-popup calendar-popup" style={{ left: 0, right: "auto", top: "110%" }}>
                  <CustomSingleDatePicker
                    selectedDate={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                  />
                </div>
              )}

              <button
                onClick={() => setShowLogsModal(true)}
                className="db-action-btn"
                title="View Raw Logs for this Date"
                style={{ padding: "0.3rem 0.5rem" }}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </div>

          <div className="db-log-list">
            {agentSummary.length === 0 ? (
              <div className="col-center" style={{ fontSize: "0.8rem", color: "#666", padding: "2rem 0", textAlign: "center" }}>
                No agents configured in system.
              </div>
            ) : (
              agentSummary.map((item) => (
                <div key={item.agentId} className="db-log-item" style={{ opacity: item.fetchCount === 0 ? 0.6 : 1 }}>
                  <div className="db-log-left">
                    <span className="db-log-agent">
                      {item.agentName} <code>[{item.agentId}]</code>
                    </span>
                    <span className="db-log-meta">
                      Last: {item.lastFetch ? new Date(item.lastFetch).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      }) : "Never"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                        {item.fetchCount}x
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "#888" }}>
                        Fetches
                      </div>
                    </div>
                    <span
                      className={`db-status-tag ${
                        item.fetchCount === 0
                          ? "db-status-idle"
                          : item.failedCount === 0
                          ? "db-status-success"
                          : "db-status-failed"
                      }`}
                      title={
                        item.fetchCount === 0
                          ? "No fetches today"
                          : `${item.successCount} Success, ${item.failedCount} Failed`
                      }
                    >
                      {item.fetchCount === 0 ? "IDLE" : item.failedCount === 0 ? "OK" : "ERR"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* RAW FETCH LOGS POPUP MODAL */}
      {showLogsModal && (
        <div className="logs-modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="logs-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">RAW SYNC LOGS: {selectedDate}</h3>
                <p className="logs-modal-subtitle">TOTAL ENTRIES: {recentLogs.length}</p>
              </div>
              <button className="logs-modal-close" onClick={() => setShowLogsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="logs-modal-body">
              <div className="table-responsive">
                <table className="proposals-table logs-modal-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>TIME</th>
                      <th>AGENT CODE</th>
                      <th>AGENT NAME</th>
                      <th>STATUS</th>
                      <th>RECORDS UPLOADED</th>
                      <th>ERROR MESSAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="col-center">
                          No logs found for this date.
                        </td>
                      </tr>
                    ) : (
                      recentLogs.map((log, idx) => (
                        <tr key={log.id}>
                          <td className="col-idx">{idx + 1}</td>
                          <td>
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </td>
                          <td><code>{log.agent_id || "-"}</code></td>
                          <td><strong>{log.agent_name || "-"}</strong></td>
                          <td>
                            <span
                              className={`status-badge ${
                                log.status?.toLowerCase() === "success"
                                  ? "status-inforce"
                                  : "status-other"
                              }`}
                            >
                              {log.status || "-"}
                            </span>
                          </td>
                          <td className="col-amount">{log.uploaded_records ?? 0}</td>
                          <td className="col-time" style={{ color: log.status?.toLowerCase() === "success" ? "#888" : "#ff4444" }}>
                            {log.error_message || "None"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY EDITOR MODAL */}
      {isCreatingCategory && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          fontFamily: "'Space Mono', monospace"
        }}>
          <div style={{
            backgroundColor: "#000",
            border: "4px solid #fff",
            boxShadow: "8px 8px 0px #fff",
            padding: "2rem",
            width: "500px",
            maxWidth: "90%",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem"
          }}>
            {/* TITLE */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #fff", paddingBottom: "0.6rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: "#fff", textTransform: "uppercase" }}>
                {editingCategoryKey ? "Edit Category" : "Create Category"}
              </h3>
              <button
                type="button"
                onClick={handleCancelCategory}
                style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* NAME INPUT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Category Name</label>
              <input
                type="text"
                placeholder="e.g. My Category Name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "2px solid #fff",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
              />
            </div>

            {/* SELECT STATUSES CHECKLIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Select Raw Statuses</label>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                maxHeight: "220px",
                overflowY: "auto",
                border: "2px solid #fff",
                padding: "0.8rem",
                backgroundColor: "#0a0a0a"
              }}>
                {allUniqueStatuses.map(status => {
                  const checked = newCatStatuses.includes(status);
                  return (
                    <label
                      key={status}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        padding: "0.2rem 0",
                        opacity: checked ? 1 : 0.6
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setNewCatStatuses(prev => prev.filter(s => s !== status));
                          } else {
                            setNewCatStatuses(prev => [...prev, status]);
                          }
                        }}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: "#fff",
                          cursor: "pointer"
                        }}
                      />
                      <span>{status}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="db-action-btn"
                style={{ flex: 1, fontSize: "0.9rem", padding: "0.6rem", justifyContent: "center" }}
                onClick={() => {
                  if (!newCatName.trim()) return;
                  if (newCatStatuses.length === 0) return;
                  
                  const updated = { ...categories };
                  
                  if (editingCategoryKey && editingCategoryKey !== newCatName.trim().toLowerCase()) {
                    delete updated[editingCategoryKey];
                  }
                  
                  updated[newCatName.trim().toLowerCase()] = newCatStatuses;
                  
                  saveCategories(updated);
                  setIsCreatingCategory(false);
                  setEditingCategoryKey(null);
                  setNewCatName("");
                  setNewCatStatuses([]);
                }}
              >
                SAVE CATEGORY
              </button>
              <button
                type="button"
                className="db-action-btn"
                style={{ flex: 1, fontSize: "0.9rem", padding: "0.6rem", justifyContent: "center", borderColor: "#ff4444", color: "#ff4444" }}
                onClick={handleCancelCategory}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW STATS CARD MODAL */}
      {isCreatingStatCard && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          fontFamily: "'Space Mono', monospace"
        }}>
          <div style={{
            backgroundColor: "#000",
            border: "4px solid #fff",
            boxShadow: "8px 8px 0px #fff",
            padding: "2rem",
            width: "450px",
            maxWidth: "90%",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem"
          }}>
            {/* TITLE */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #fff", paddingBottom: "0.6rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: "#fff", textTransform: "uppercase" }}>
                Create Metric Card
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingStatCard(false)}
                style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* CARD NAME */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Card Title</label>
              <input
                type="text"
                placeholder="e.g. Cancelled Proposals..."
                value={newStatCardName}
                onChange={(e) => setNewStatCardName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "2px solid #fff",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
              />
            </div>

            {/* STATUS CATEGORY SELECT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Status Category</label>
              <select
                value={newStatCardCategory}
                onChange={(e) => setNewStatCardCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "2px solid #fff",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.95rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="db-action-btn"
                style={{ flex: 1, fontSize: "0.9rem", padding: "0.6rem", justifyContent: "center" }}
                onClick={handleSaveStatCard}
              >
                CREATE CARD
              </button>
              <button
                type="button"
                className="db-action-btn"
                style={{ flex: 1, fontSize: "0.9rem", padding: "0.6rem", justifyContent: "center", borderColor: "#ff4444", color: "#ff4444" }}
                onClick={() => setIsCreatingStatCard(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN DETAILS MODAL */}
      {selectedPlanDetailsName && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          fontFamily: "'Space Mono', monospace"
        }}>
          <div style={{
            backgroundColor: "#000",
            border: "4px solid #fff",
            boxShadow: "8px 8px 0px #fff",
            padding: "2rem",
            width: "1200px",
            maxWidth: "95%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem"
          }}>
            {/* TITLE */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #fff", paddingBottom: "0.6rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: "#fff", textTransform: "uppercase" }}>
                  Plan Details: {selectedPlanDetailsName}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: "bold" }}>
                  {planProposals.length} RECORDS FOUND MATCHING CURRENT METRIC FILTERS
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanDetailsName(null);
                  setModalCategoryFilter("ALL");
                }}
                style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                title="Close Modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* CATEGORY FILTER SELECTOR */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", borderBottom: "1px dashed #333", paddingBottom: "0.8rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Filter Status Category:</span>
              <button
                type="button"
                className="db-action-btn"
                style={{
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.6rem",
                  borderColor: modalCategoryFilter === "ALL" ? "#33b5e5" : "#fff",
                  color: modalCategoryFilter === "ALL" ? "#33b5e5" : "#fff"
                }}
                onClick={() => setModalCategoryFilter("ALL")}
              >
                ALL
              </button>
              {Object.keys(categories).map(catKey => {
                const isSelected = modalCategoryFilter === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    className="db-action-btn"
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.2rem 0.6rem",
                      borderColor: isSelected ? "#33b5e5" : "#fff",
                      color: isSelected ? "#33b5e5" : "#fff"
                    }}
                    onClick={() => setModalCategoryFilter(catKey)}
                  >
                    {catKey.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* DATA TABLE */}
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh", border: "2px solid #fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "#fff", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#111", borderBottom: "2px solid #fff" }}>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>#</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>PROPOSAL NO</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>CUSTOMER NAME</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>POLICY NO</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>STATUS</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>PAYMENT (₹)</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>GWP (₹)</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>LOGIN DATE</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>START DATE</th>
                    <th style={{ padding: "0.6rem 0.8rem" }}>AGENT NAME</th>
                  </tr>
                </thead>
                <tbody>
                  {planProposals.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                        NO MATCHING DIRECTORY ROWS FOUND.
                      </td>
                    </tr>
                  ) : (
                    planProposals.map((item, idx) => (
                      <tr key={item.proposal_no || idx} style={{ borderBottom: "1px solid #333", backgroundColor: idx % 2 === 0 ? "#050505" : "#000" }}>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333", color: "#888" }}>{idx + 1}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          <code>{item.proposal_no || "-"}</code>
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333", fontWeight: "bold" }}>
                          {item.customer_name || "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.policy_no || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          <span className={`status-badge ${
                            item.proposal_status?.toLowerCase() === "inforce"
                              ? "status-inforce"
                              : item.proposal_status?.toLowerCase() === "pending"
                              ? "status-pending"
                              : "status-other"
                          }`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                            {item.proposal_status || "-"}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.login_date || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.policy_start_date || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem" }}>{item.agent_name || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="db-action-btn"
                onClick={() => {
                  setSelectedPlanDetailsName(null);
                  setModalCategoryFilter("ALL");
                }}
                style={{ fontSize: "0.85rem", padding: "0.5rem 1.5rem" }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS CATEGORY DRILL-DOWN MODAL */}
      {selectedStatsCatModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          fontFamily: "'Space Mono', monospace"
        }}>
          <div style={{
            backgroundColor: "#000",
            border: "4px solid #fff",
            boxShadow: "8px 8px 0px #fff",
            padding: "2rem",
            width: "1200px",
            maxWidth: "95%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem"
          }}>
            {/* TITLE */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #fff", paddingBottom: "0.6rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: "#fff", textTransform: "uppercase" }}>
                  {statsCatModalTitle}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: "bold" }}>
                  {statsCatProposals.length} RECORDS MATCHING CURRENT METRIC FILTERS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStatsCatModal(null)}
                style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                title="Close Modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* DATA TABLE */}
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh", border: "2px solid #fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "#fff", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#111", borderBottom: "2px solid #fff" }}>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>#</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>PROPOSAL NO</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>CUSTOMER NAME</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>POLICY NO</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>PLAN</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>STATUS</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>PAYMENT (₹)</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>GWP (₹)</th>
                    <th style={{ padding: "0.6rem 0.8rem", borderRight: "1px solid #333" }}>LOGIN DATE</th>
                    <th style={{ padding: "0.6rem 0.8rem" }}>AGENT NAME</th>
                  </tr>
                </thead>
                <tbody>
                  {statsCatProposals.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                        NO MATCHING DIRECTORY ROWS FOUND.
                      </td>
                    </tr>
                  ) : (
                    statsCatProposals.map((item, idx) => (
                      <tr key={item.proposal_no || idx} style={{ borderBottom: "1px solid #333", backgroundColor: idx % 2 === 0 ? "#050505" : "#000" }}>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333", color: "#888" }}>{idx + 1}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          <code>{item.proposal_no || "-"}</code>
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333", fontWeight: "bold" }}>
                          {item.customer_name || "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.policy_no || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.plan || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          <span className={`status-badge ${
                            item.proposal_status?.toLowerCase() === "inforce"
                              ? "status-inforce"
                              : item.proposal_status?.toLowerCase() === "pending"
                              ? "status-pending"
                              : "status-other"
                          }`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                            {item.proposal_status || "-"}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>
                          {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "0.5rem 0.8rem", borderRight: "1px solid #333" }}>{item.login_date || "-"}</td>
                        <td style={{ padding: "0.5rem 0.8rem" }}>{item.agent_name || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="db-action-btn"
                onClick={() => setSelectedStatsCatModal(null)}
                style={{ fontSize: "0.85rem", padding: "0.5rem 1.5rem" }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADDITIONAL CUSTOM CSS FOR DATE PICKER */}
      <style jsx global>{`
        .db-date-picker {
          background-color: var(--black);
          color: var(--white);
          border: 2px solid var(--white);
          padding: 0.3rem 0.5rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          outline: none;
          cursor: pointer;
        }

        .db-date-picker::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
        
        [data-theme="light"] .db-date-picker::-webkit-calendar-picker-indicator {
          filter: invert(0);
        }

        .db-status-idle {
          background-color: rgba(136, 136, 136, 0.15);
          color: #888;
          border: 1px solid #888;
        }

        .card-edit-dropdown {
          position: absolute;
          top: 2.2rem;
          right: 0.5rem;
          background-color: #000;
          border: 2px solid #fff;
          z-index: 5000;
          display: flex;
          flex-direction: column;
          min-width: 150px;
          box-shadow: 4px 4px 0px #fff;
        }
        .card-edit-option {
          background: none;
          border: none;
          color: #fff;
          padding: 0.4rem 0.6rem;
          text-align: left;
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          text-transform: uppercase;
          cursor: pointer;
        }
        .card-edit-option:hover {
          background-color: #fff;
          color: #000;
        }
        .stat-edit-btn {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          background: none;
          border: 1.5px solid currentColor;
          border-radius: 3px;
          padding: 0.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.4;
          transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
        }
        .db-stat-card:hover .stat-edit-btn {
          opacity: 1;
          transform: scale(1.15);
          background-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
