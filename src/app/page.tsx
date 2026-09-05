"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomDateRangePicker from "@/components/CustomDateRangePicker";
import {
  Search,
  X,
  Filter,
  FileText,
  Building2,
  User,
  Calendar,
  Clock,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Download,
  Star,
  Tag,
  Plus,
  Trash2,
  Folder,
  Info,
  Sun,
  Moon
} from "lucide-react";
import "./globals.css";

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

export interface UserCategory {
  id: string;
  name: string;
  color: string;
  isPrimary?: boolean;
}

const PAGE_SIZE = 50;

export default function ProposalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Categories Local System State (Persisted in localStorage)
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("ALL");
  const [proposalCategoriesMap, setProposalCategoriesMap] = useState<Record<string, string[]>>({});
  const [showManageCatModal, setShowManageCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [taggingProposalNo, setTaggingProposalNo] = useState<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [gwpMode, setGwpMode] = useState<"gwp" | "net">("gwp");

  // Load Categories & Proposal Assignments from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("tfc_theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }

      const savedSession = localStorage.getItem("tfc_user_session");
      if (savedSession) {
        setCurrentUser(JSON.parse(savedSession));
      }

      const savedCats = localStorage.getItem("tfc_user_categories");
      if (savedCats) {
        const parsed: UserCategory[] = JSON.parse(savedCats);
        setUserCategories(parsed);
        const primaryCat = parsed.find(c => c.isPrimary);
        if (primaryCat) {
          setActiveCategoryId(primaryCat.id);
        }
      } else {
        const defaultCats: UserCategory[] = [
          { id: "cat_hot", name: "Hot Leads", color: "#ff4444", isPrimary: false },
          { id: "cat_followup", name: "Urgent Followup", color: "#ffbb00", isPrimary: false }
        ];
        setUserCategories(defaultCats);
        localStorage.setItem("tfc_user_categories", JSON.stringify(defaultCats));
      }

      const savedMap = localStorage.getItem("tfc_proposal_categories_map");
      if (savedMap) {
        setProposalCategoriesMap(JSON.parse(savedMap));
      }

      const savedGwpMode = localStorage.getItem("tfc_gwp_card_mode") as "gwp" | "net" | null;
      if (savedGwpMode) {
        setGwpMode(savedGwpMode);
      }
    } catch (e) {
      console.error("Error reading localStorage for categories:", e);
    }
  }, []);

  // Save Categories to localStorage
  const saveCategories = (updatedCats: UserCategory[]) => {
    setUserCategories(updatedCats);
    try {
      localStorage.setItem("tfc_user_categories", JSON.stringify(updatedCats));
    } catch (e) {
      console.error("Error saving categories to localStorage:", e);
    }
  };

  // Save Proposal Category Mapping to localStorage
  const saveProposalMap = (updatedMap: Record<string, string[]>) => {
    setProposalCategoriesMap(updatedMap);
    try {
      localStorage.setItem("tfc_proposal_categories_map", JSON.stringify(updatedMap));
    } catch (e) {
      console.error("Error saving proposal mapping to localStorage:", e);
    }
  };

  // Toggle Category as Primary (Star Button)
  const togglePrimaryCategory = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = userCategories.map(cat => ({
      ...cat,
      isPrimary: cat.id === catId ? !cat.isPrimary : false
    }));
    saveCategories(updated);
  };

  // Create New Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const colors = ["#ff4444", "#33b5e5", "#ffbb00", "#00c851", "#aa66cc", "#ff8800"];
    const randomColor = colors[userCategories.length % colors.length];
    const newCat: UserCategory = {
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      color: randomColor,
      isPrimary: false
    };
    saveCategories([...userCategories, newCat]);
    setNewCatName("");
  };

  // Delete Category
  const handleDeleteCategory = (catId: string) => {
    const updated = userCategories.filter(c => c.id !== catId);
    saveCategories(updated);
    if (activeCategoryId === catId) {
      setActiveCategoryId("ALL");
    }
  };

  // Assign/Unassign Proposal to Category
  const toggleProposalCategory = (proposalNo: string, catId: string) => {
    const currentTags = proposalCategoriesMap[proposalNo] || [];
    let updatedTags: string[];
    if (currentTags.includes(catId)) {
      updatedTags = currentTags.filter(id => id !== catId);
    } else {
      updatedTags = [...currentTags, catId];
    }
    const updatedMap = { ...proposalCategoriesMap, [proposalNo]: updatedTags };
    saveProposalMap(updatedMap);
  };

  // Active Dropdown state & Mobile Filter Modal state
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [showMobileFilterModal, setShowMobileFilterModal] = useState<boolean>(false);

  // Single Select Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("ALL");
  const [agentFilter, setAgentFilter] = useState<string>("ALL");

  // Date Range Filters State (YYYY-MM-DD)
  const [loginDateFrom, setLoginDateFrom] = useState<string>("");
  const [loginDateTo, setLoginDateTo] = useState<string>("");

  const [startDateFrom, setStartDateFrom] = useState<string>("");
  const [startDateTo, setStartDateTo] = useState<string>("");

  // Options State
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [planOptions, setPlanOptions] = useState<string[]>([]);
  const [businessTypeOptions, setBusinessTypeOptions] = useState<string[]>([]);
  const [agentOptions, setAgentOptions] = useState<string[]>([]);

  // Faveo Logs State & Modal State
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  interface FaveoLogRecord {
    idx?: number;
    id: string;
    agent_id: string;
    agent_name: string;
    status: string;
    total_records: number;
    uploaded_records: number;
    start_date: string;
    end_date: string;
    error_message: string | null;
    timestamp: string;
  }
  const [faveoLogs, setFaveoLogs] = useState<FaveoLogRecord[]>([]);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsStatusFilter, setLogsStatusFilter] = useState("ALL");
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [showUniqueErrorsModal, setShowUniqueErrorsModal] = useState(false);

  const uniqueErrorMessages = React.useMemo(() => {
    const map = new Map<string, number>();
    faveoLogs.forEach((log) => {
      const err = log.error_message?.trim();
      if (err && err !== "None") {
        map.set(err, (map.get(err) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count);
  }, [faveoLogs]);

  const fetchLogs = useCallback(async () => {
    try {
      const { data: logsData } = await supabase
        .from("faveo_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (logsData) {
        setFaveoLogs(logsData);
      }
    } catch (e) {
      console.error("Error loading faveo_logs", e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    // Auto-refresh faveo_logs every 1 minute (60,000 ms)
    const intervalId = setInterval(() => {
      fetchLogs();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchLogs]);

  const filteredFaveoLogs = React.useMemo(() => {
    return faveoLogs.filter((log) => {
      const q = logsSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (log.agent_name && log.agent_name.toLowerCase().includes(q)) ||
        (log.agent_id && log.agent_id.toLowerCase().includes(q)) ||
        (log.error_message && log.error_message.toLowerCase().includes(q)) ||
        (log.status && log.status.toLowerCase().includes(q)) ||
        (log.id && String(log.id).toLowerCase().includes(q));

      const matchesStatus =
        logsStatusFilter === "ALL" ||
        (log.status && log.status.toLowerCase() === logsStatusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });
  }, [faveoLogs, logsSearch, logsStatusFilter]);

  const logsTotalPages = Math.ceil(filteredFaveoLogs.length / (logsPageSize === -1 ? filteredFaveoLogs.length || 1 : logsPageSize)) || 1;

  const paginatedFaveoLogs = React.useMemo(() => {
    if (logsPageSize === -1) return filteredFaveoLogs;
    const start = (logsCurrentPage - 1) * logsPageSize;
    return filteredFaveoLogs.slice(start, start + logsPageSize);
  }, [filteredFaveoLogs, logsCurrentPage, logsPageSize]);

  useEffect(() => {
    setLogsCurrentPage(1);
  }, [logsSearch, logsStatusFilter, logsPageSize]);

  const [allProposals, setAllProposals] = useState<ProposalRecord[]>([]);

  // Calculate filter options dynamically when allProposals updates
  useEffect(() => {
    if (allProposals.length > 0) {
      const statuses = Array.from(new Set(allProposals.map((item) => item.proposal_status).filter(Boolean))) as string[];
      const plans = Array.from(new Set(allProposals.map((item) => item.plan).filter(Boolean))) as string[];
      const types = Array.from(new Set(allProposals.map((item) => item.business_type).filter(Boolean))) as string[];
      const agents = Array.from(new Set(allProposals.map((item) => item.agent_name).filter(Boolean))) as string[];

      setStatusOptions(statuses.sort());
      setPlanOptions(plans.sort());
      setBusinessTypeOptions(types.sort());
      setAgentOptions(agents.sort());
    }
  }, [allProposals]);

  // 1. Fetch ALL records from Supabase ONCE on page mount (handling PostgREST 1000 row cap)
  const fetchAllProposals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      let allData: ProposalRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: supabaseError } = await supabase
          .from("faveo_data")
          .select("*")
          .order("updated_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (supabaseError) {
          throw supabaseError;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setAllProposals(allData);
    } catch (err: any) {
      console.error("Error fetching proposals:", err);
      setError(err.message || "Failed to load proposals data from Supabase.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleDeleteProposal = async (proposalNo: string) => {
    if (!window.confirm(`ARE YOU SURE YOU WANT TO DELETE PROPOSAL NO ${proposalNo}?`)) return;
    try {
      const { error } = await supabase
        .from("faveo_data")
        .delete()
        .eq("proposal_no", proposalNo);
      if (error) throw error;
      
      setAllProposals(prev => prev.filter(p => p.proposal_no !== proposalNo));
    } catch (err: any) {
      alert("FAILED TO DELETE PROPOSAL: " + err.message);
    }
  };

  useEffect(() => {
    fetchAllProposals();

    // Auto-refresh proposals every 3 minutes (180,000 ms)
    const intervalId = setInterval(() => {
      fetchAllProposals(true);
    }, 180000);

    return () => clearInterval(intervalId);
  }, [fetchAllProposals]);

  // 2. Filter ALL fetched records locally based on search, category & active filter choices
  const filteredProposals = allProposals.filter((item) => {
    // Filter by Selected Category
    if (activeCategoryId !== "ALL") {
      const assignedCats = proposalCategoriesMap[item.proposal_no] || [];
      if (!assignedCats.includes(activeCategoryId)) {
        return false;
      }
    }

    // Exclude RENEWAL by default when businessTypeFilter === "ALL"
    if (businessTypeFilter === "ALL" && item.business_type === "RENEWAL") {
      return false;
    }
    if (businessTypeFilter !== "ALL" && item.business_type !== businessTypeFilter) {
      return false;
    }

    if (statusFilter !== "ALL" && item.proposal_status !== statusFilter) {
      return false;
    }

    if (planFilter !== "ALL" && item.plan !== planFilter) {
      return false;
    }

    if (agentFilter !== "ALL" && item.agent_name !== agentFilter) {
      return false;
    }

    if (loginDateFrom && item.login_date && item.login_date < loginDateFrom) {
      return false;
    }

    if (loginDateTo && item.login_date && item.login_date > loginDateTo) {
      return false;
    }

    if (startDateFrom && item.policy_start_date && item.policy_start_date < startDateFrom) {
      return false;
    }

    if (startDateTo && item.policy_start_date && item.policy_start_date > startDateTo) {
      return false;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        item.customer_name?.toLowerCase().includes(q) ||
        item.proposal_no?.toLowerCase().includes(q) ||
        item.policy_no?.toLowerCase().includes(q) ||
        item.agent_name?.toLowerCase().includes(q) ||
        item.plan?.toLowerCase().includes(q) ||
        item.business_type?.toLowerCase().includes(q);

      if (!matchSearch) return false;
    }

    return true;
  });

  // 3. Paginate filtered data locally in chunks of 50 records
  const totalCount = filteredProposals.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const currentChunk = filteredProposals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleDropdown = (name: string) => {
    setActiveFilterDropdown(prev => prev === name ? null : name);
  };

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    planFilter !== "ALL" ||
    businessTypeFilter !== "ALL" ||
    agentFilter !== "ALL" ||
    loginDateFrom !== "" ||
    loginDateTo !== "" ||
    startDateFrom !== "" ||
    startDateTo !== "";

  const resetAllFilters = () => {
    setStatusFilter("ALL");
    setPlanFilter("ALL");
    setBusinessTypeFilter("ALL");
    setAgentFilter("ALL");
    setLoginDateFrom("");
    setLoginDateTo("");
    setStartDateFrom("");
    setStartDateTo("");
    setSearchQuery("");
    setCurrentPage(1);
    setActiveFilterDropdown(null);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("tfc_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

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
  const handleLoginRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    const key = getDynamicKey();
    const timestamp = Math.floor(Date.now() / 1000);
    const obfTime = btoa(timestamp.toString()); // Base64 obfuscation
    router.push(`/login?tfc_key=${key}&tfc_time=${obfTime}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("tfc_user_session");
    setCurrentUser(null);
  };

  return (
    <div className="proposals-page-wrapper">
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "100%", marginBottom: "-1rem", gap: "0.5rem" }}>
        {currentUser ? (
          <div className="user-profile-badge" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="user-profile-name" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
              👤 {currentUser.user_name || currentUser.employee_id} ({currentUser.role || "Admin"})
            </span>
            <Link href="/dashboard" className="theme-toggle-btn" title="Go to Admin Dashboard" style={{ textDecoration: "none" }}>
              DASHBOARD
            </Link>
            <button onClick={handleLogout} className="theme-toggle-btn logout-btn" title="Logout" style={{ borderColor: "#ff4444", color: "#ff4444" }}>
              LOGOUT
            </button>
          </div>
        ) : (
          <button onClick={handleLoginRedirect} className="theme-toggle-btn" title="Dashboard Login">
            <User size={14} />
            DASHBOARD LOGIN
          </button>
        )}
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          {theme === "dark" ? "LIGHT" : "DARK"}
        </button>
      </div>
      <header className="proposals-header">
        <div className="header-left">
          <Link href="/extension" className="back-link">
            &larr; BACK TO EXTENSION PAGE
          </Link>
          <h1 className="proposals-title">PROPOSALS DIRECTORY</h1>
          <p className="proposals-subtitle">
            THE FINANCIAL CRAFT &bull; PROPOSAL STATUS & DIRECTORY &bull; 50 RECORDS PER PAGE
          </p>
        </div>
        <div className="header-agent-logs">
          <div className="agent-logs-title">
            <span>RECENT AGENT FETCH LOGS</span>
            <button
              className="logs-redirect-btn"
              title="View Full Agent Fetch Logs"
              onClick={() => setShowLogsModal(true)}
            >
              <ExternalLink size={14} />
            </button>
          </div>
          <div className="agent-logs-list">
            {faveoLogs.length === 0 ? (
              <div className="agent-log-item">No agent fetch logs recorded</div>
            ) : (
              faveoLogs.slice(0, 4).map((log, idx) => (
                <div key={log.id || idx} className="agent-log-item">
                  <div className="log-agent-info">
                    <span className="log-agent-name">{log.agent_name || "Unknown Agent"}</span>
                  </div>
                  <div className="log-details">
                    <span className={`log-status ${log.status?.toLowerCase() === "success" ? "success" : "failed"}`}>
                      {log.status}
                    </span>
                    <span className="log-records">{log.uploaded_records ?? log.total_records ?? 0} Recs</span>
                    <span className="log-time">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </header>

      {/* SEARCH BAR & INDIVIDUAL SEPARATE FILTER BOXES */}
      <div className="top-filter-bar">
        {/* MAIN SEARCH INPUT DIV */}
        <div className="search-input-box">
          <Search className="search-icon-svg" size={16} />
          <input
            type="text"
            placeholder="Search by Proposal No, Customer Name, Policy No..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input-field"
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* STANDALONE SEPARATE FILTER BUTTON DIV FOR MOBILE */}
        <div className="mobile-standalone-filter-box">
          <button
            className={`mobile-filter-trigger-btn ${hasActiveFilters ? "active" : ""}`}
            onClick={() => setShowMobileFilterModal(true)}
            title="All Filters"
          >
            <Filter size={18} />
            {hasActiveFilters && <span className="mobile-filter-dot" />}
          </button>
        </div>

        {/* INDIVIDUAL SEPARATE DIV FOR EACH FILTER ICON (DESKTOP) */}
        <div className="filter-buttons-wrapper">

          {/* DIV 0: CATEGORY FILTER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${activeCategoryId !== "ALL" ? "active" : ""}`}
              title="Filter by Category"
              onClick={() => toggleDropdown("category")}
            >
              <Folder size={16} />
              <span className="filter-btn-label">
                {activeCategoryId === "ALL"
                  ? "CATEGORY"
                  : userCategories.find(c => c.id === activeCategoryId)?.name.toUpperCase() || "CATEGORY"}
              </span>
            </button>
            {activeFilterDropdown === "category" && (
              <div className="filter-dropdown-popup">
                <div className="dropdown-title">USER CATEGORIES</div>
                <select
                  value={activeCategoryId}
                  onChange={(e) => {
                    setActiveCategoryId(e.target.value);
                    setCurrentPage(1);
                    setActiveFilterDropdown(null);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  {userCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.isPrimary ? `⭐ ${cat.name}` : cat.name}
                    </option>
                  ))}
                </select>

                <button
                  className="category-manage-btn"
                  onClick={() => {
                    setActiveFilterDropdown(null);
                    setShowManageCatModal(true);
                  }}
                >
                  <Plus size={14} /> MANAGE CATEGORIES
                </button>
              </div>
            )}
          </div>

          {/* DIV 1: STATUS FILTER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${statusFilter !== "ALL" ? "active" : ""}`}
              title="Filter by Status"
              onClick={() => toggleDropdown("status")}
            >
              <Filter size={16} />
              <span className="filter-btn-label">STATUS</span>
            </button>
            {activeFilterDropdown === "status" && (
              <div className="filter-dropdown-popup">
                <div className="dropdown-title">PROPOSAL STATUS</div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                    setActiveFilterDropdown(null);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL STATUSES</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DIV 2: PLAN FILTER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${planFilter !== "ALL" ? "active" : ""}`}
              title="Filter by Plan"
              onClick={() => toggleDropdown("plan")}
            >
              <FileText size={16} />
              <span className="filter-btn-label">PLAN</span>
            </button>
            {activeFilterDropdown === "plan" && (
              <div className="filter-dropdown-popup">
                <div className="dropdown-title">PLAN</div>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                    setActiveFilterDropdown(null);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL PLANS</option>
                  {planOptions.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DIV 3: BUSINESS TYPE FILTER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${businessTypeFilter !== "ALL" ? "active" : ""}`}
              title="Filter by Business Type"
              onClick={() => toggleDropdown("businessType")}
            >
              <Building2 size={16} />
              <span className="filter-btn-label">TYPE</span>
            </button>
            {activeFilterDropdown === "businessType" && (
              <div className="filter-dropdown-popup">
                <div className="dropdown-title">BUSINESS TYPE</div>
                <select
                  value={businessTypeFilter}
                  onChange={(e) => {
                    setBusinessTypeFilter(e.target.value);
                    setCurrentPage(1);
                    setActiveFilterDropdown(null);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL TYPES</option>
                  {businessTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DIV 4: AGENT NAME FILTER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${agentFilter !== "ALL" ? "active" : ""}`}
              title="Filter by Agent"
              onClick={() => toggleDropdown("agent")}
            >
              <User size={16} />
              <span className="filter-btn-label">AGENT</span>
            </button>
            {activeFilterDropdown === "agent" && (
              <div className="filter-dropdown-popup">
                <div className="dropdown-title">AGENT NAME</div>
                <select
                  value={agentFilter}
                  onChange={(e) => {
                    setAgentFilter(e.target.value);
                    setCurrentPage(1);
                    setActiveFilterDropdown(null);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL AGENTS</option>
                  {agentOptions.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DIV 5: LOGIN DATE CUSTOM CALENDAR PICKER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${(loginDateFrom || loginDateTo) ? "active" : ""}`}
              title="Filter by Login Date Range"
              onClick={() => toggleDropdown("loginDate")}
            >
              <Calendar size={16} />
              <span className="filter-btn-label">
                {loginDateFrom || loginDateTo ? "LOGIN CALENDAR" : "LOGIN DATE"}
              </span>
            </button>
            {activeFilterDropdown === "loginDate" && (
              <div className="filter-dropdown-popup calendar-popup">
                <CustomDateRangePicker
                  fromDate={loginDateFrom}
                  toDate={loginDateTo}
                  onChange={(from, to) => {
                    setLoginDateFrom(from);
                    setLoginDateTo(to);
                    setCurrentPage(1);
                  }}
                  onClose={() => setActiveFilterDropdown(null)}
                />
              </div>
            )}
          </div>

          {/* DIV 6: START DATE CUSTOM CALENDAR PICKER */}
          <div className="separate-filter-box">
            <button
              className={`filter-box-btn ${(startDateFrom || startDateTo) ? "active" : ""}`}
              title="Filter by Policy Start Date Range"
              onClick={() => toggleDropdown("startDate")}
            >
              <Clock size={16} />
              <span className="filter-btn-label">
                {startDateFrom || startDateTo ? "START CALENDAR" : "START DATE"}
              </span>
            </button>
            {activeFilterDropdown === "startDate" && (
              <div className="filter-dropdown-popup calendar-popup">
                <CustomDateRangePicker
                  fromDate={startDateFrom}
                  toDate={startDateTo}
                  onChange={(from, to) => {
                    setStartDateFrom(from);
                    setStartDateTo(to);
                    setCurrentPage(1);
                  }}
                  onClose={() => setActiveFilterDropdown(null)}
                />
              </div>
            )}
          </div>


          {/* DIV 7: RESET FILTERS DIV */}
          {hasActiveFilters && (
            <div className="separate-filter-box">
              <button
                className="reset-all-box-btn"
                title="Reset All Filters"
                onClick={resetAllFilters}
              >
                <RotateCcw size={15} />
                <span className="filter-btn-label">RESET</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-banner">
          <AlertTriangle className="error-icon-svg" size={24} />
          <div className="error-text">
            <strong>SUPABASE CONNECTION NOTICE:</strong>
            <p>{error}</p>
            <small>
              Make sure to configure your Supabase URL & Anon key in <code>.env.local</code> file:
              <br />
              <code>NEXT_PUBLIC_SUPABASE_URL</code> & <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </small>
          </div>
          <button className="retry-btn" onClick={() => fetchAllProposals()}>RETRY</button>
        </div>
      )}

      {/* DATA TABLE CONTAINER */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>FETCHING PROPOSALS FROM SUPABASE...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="empty-state">
            <p>NO PROPOSALS FOUND MATCHING YOUR SEARCH QUERY.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="proposals-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PROPOSAL NO</th>
                  <th>CUSTOMER NAME</th>
                  <th>POLICY NO</th>
                  <th>PLAN</th>
                  <th>STATUS</th>
                  {gwpMode === "gwp" ? (
                    <>
                      <th>PAYMENT (₹)</th>
                      <th>GWP (₹)</th>
                    </>
                  ) : (
                    <>
                      <th>GWP (₹)</th>
                      <th>PAYMENT (₹)</th>
                    </>
                  )}
                  <th>LOGIN DATE</th>
                  <th>START DATE</th>
                  <th>LIVES</th>
                  <th>TYPE</th>
                  <th>AGENT NAME</th>
                  <th>CATEGORIES</th>
                  <th>UPDATED AT</th>
                  {currentUser?.role?.toLowerCase() === "admin" && <th>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {currentChunk.map((item, index) => {
                  const recordIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const statusClass =
                    item.proposal_status?.toLowerCase() === "inforce"
                      ? "status-inforce"
                      : item.proposal_status?.toLowerCase() === "pending"
                      ? "status-pending"
                      : "status-other";

                  const assignedCatIds = proposalCategoriesMap[item.proposal_no] || [];
                  const assignedCats = userCategories.filter(c => assignedCatIds.includes(c.id));

                  return (
                    <tr key={item.proposal_no || item.idx || index}>
                      <td className="col-idx">{recordIndex}</td>
                      <td className="col-proposal">
                        <code>{item.proposal_no || "-"}</code>
                      </td>
                      <td className="col-customer">
                        <strong>{item.customer_name || "-"}</strong>
                      </td>
                      <td className="col-policy">{item.policy_no || "-"}</td>
                      <td className="col-plan">{item.plan || "-"}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {item.proposal_status || "-"}
                        </span>
                      </td>
                      {gwpMode === "gwp" ? (
                        <>
                          <td className="col-amount">
                            {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                          </td>
                          <td className="col-amount">
                            {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="col-amount">
                            {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                          </td>
                          <td className="col-amount">
                            {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                          </td>
                        </>
                      )}
                      <td>{item.login_date || "-"}</td>
                      <td>{item.policy_start_date || "-"}</td>
                      <td className="col-center">{item.no_of_lives ?? "-"}</td>
                      <td>
                        <span className="type-tag">{item.business_type || "-"}</span>
                      </td>
                      <td>{item.agent_name || "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
                          {assignedCats.map(cat => (
                            <span key={cat.id} className="category-badge-tag" style={{ borderColor: cat.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          ))}
                          <button
                            className="category-tag-add-btn"
                            onClick={() => setTaggingProposalNo(item.proposal_no)}
                            title="Tag Categories"
                          >
                            <Tag size={12} /> {assignedCats.length === 0 ? "Tag" : "+"}
                          </button>
                        </div>
                      </td>
                      <td className="col-time">
                        {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}
                      </td>
                      {currentUser?.role?.toLowerCase() === "admin" && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteProposal(item.proposal_no)}
                            style={{
                              background: "none",
                              border: "1px solid #ff4444",
                              color: "#ff4444",
                              padding: "0.2rem 0.4rem",
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "0.65rem",
                              cursor: "pointer",
                              textTransform: "uppercase"
                            }}
                          >
                            DEL
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        <div className="pagination-bar">
          <div className="pagination-info">
            SHOWING {filteredProposals.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} TO{" "}
            {Math.min(currentPage * PAGE_SIZE, totalCount)} OF {totalCount} ENTRIES
          </div>

          <div className="pagination-buttons">
            <button
              className="page-btn"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || loading}
              title="First Page"
            >
              &laquo; FIRST
            </button>
            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              &larr; PREV
            </button>

            <span className="page-indicator">
              PAGE <strong>{currentPage}</strong> OF <strong>{totalPages}</strong>
            </span>

            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              NEXT &rarr;
            </button>
            <button
              className="page-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading}
              title="Last Page"
            >
              LAST &raquo;
            </button>
          </div>
        </div>
      </div>

      {/* FAVEO LOGS BLURRED BACKDROP POPUP MODAL */}
      {showLogsModal && (
        <div className="logs-modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="logs-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">AGENT FETCH LOGS DIRECTORY</h3>
                <p className="logs-modal-subtitle">
                  DATABASE TABLE: <code>faveo_logs</code> &bull; Total Records: <strong>{faveoLogs.length}</strong>
                </p>
              </div>
              <button className="logs-modal-close" onClick={() => setShowLogsModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* LOGS TOOLBAR */}
            <div className="logs-modal-toolbar">
              <div className="logs-modal-search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search logs by Agent Name, ID, Error..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                />
              </div>

              <div className="logs-modal-filters">
                <select
                  className="logs-modal-select"
                  value={logsStatusFilter}
                  onChange={(e) => setLogsStatusFilter(e.target.value)}
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="success">SUCCESS</option>
                  <option value="dom_error">DOM_ERROR</option>
                  <option value="error">ERROR</option>
                  <option value="fetching">FETCHING</option>
                </select>

                <select
                  className="logs-modal-select"
                  value={logsPageSize}
                  onChange={(e) => setLogsPageSize(Number(e.target.value))}
                >
                  <option value={10}>10 PER PAGE</option>
                  <option value={25}>25 PER PAGE</option>
                  <option value={50}>50 PER PAGE</option>
                  <option value={100}>100 PER PAGE</option>
                  <option value={250}>250 PER PAGE</option>
                  <option value={-1}>SHOW ALL LOGS</option>
                </select>

                <button
                  type="button"
                  className="logs-info-btn"
                  onClick={() => setShowUniqueErrorsModal(true)}
                  title="View All Unique Error Messages"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>

            <div className="logs-modal-body">
              <div className="table-responsive">
                <table className="proposals-table logs-modal-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>LOG ID</th>
                      <th>AGENT NAME</th>
                      <th>AGENT ID</th>
                      <th>STATUS</th>
                      <th>TOTAL RECS</th>
                      <th>UPLOADED RECS</th>
                      <th>START DATE</th>
                      <th>END DATE</th>
                      <th>ERROR MESSAGE</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaveoLogs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="col-center">
                          {faveoLogs.length === 0
                            ? "No logs recorded in faveo_logs table."
                            : "No logs found matching your search filter."}
                        </td>
                      </tr>
                    ) : (
                      paginatedFaveoLogs.map((log, idx) => {
                        const globalIdx =
                          logsPageSize === -1
                            ? idx + 1
                            : (logsCurrentPage - 1) * logsPageSize + idx + 1;
                        const isError =
                          log.status?.toLowerCase().includes("error") ||
                          log.status?.toLowerCase().includes("fail");
                        return (
                          <tr key={log.id || idx}>
                            <td className="col-idx">{globalIdx}</td>
                            <td><code>{log.id || "-"}</code></td>
                            <td><strong>{log.agent_name || "-"}</strong></td>
                            <td><code>{log.agent_id || "-"}</code></td>
                            <td>
                              <span
                                className={`status-badge ${
                                  log.status?.toLowerCase() === "success"
                                    ? "status-inforce"
                                    : log.status?.toLowerCase() === "fetching"
                                    ? "status-pending"
                                    : isError
                                    ? "status-failed"
                                    : "status-other"
                                }`}
                              >
                                {log.status || "-"}
                              </span>
                            </td>
                            <td className="col-amount">{log.total_records ?? 0}</td>
                            <td className="col-amount">{log.uploaded_records ?? 0}</td>
                            <td>{log.start_date || "-"}</td>
                            <td>{log.end_date || "-"}</td>
                            <td className={log.error_message && log.error_message !== "None" ? "col-error-text" : "col-time"}>
                              {log.error_message || "None"}
                            </td>
                            <td className="col-time">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LOGS PAGINATOR FOOTER */}
            <div className="logs-modal-footer">
              <div className="pagination-info">
                SHOWING {filteredFaveoLogs.length > 0 ? (logsPageSize === -1 ? 1 : (logsCurrentPage - 1) * logsPageSize + 1) : 0} TO{" "}
                {logsPageSize === -1 ? filteredFaveoLogs.length : Math.min(logsCurrentPage * logsPageSize, filteredFaveoLogs.length)} OF {filteredFaveoLogs.length} LOGS
              </div>

              <div className="pagination-buttons">
                <button
                  className="page-btn"
                  onClick={() => setLogsCurrentPage(1)}
                  disabled={logsCurrentPage === 1 || logsPageSize === -1}
                  title="First Page"
                >
                  &laquo; FIRST
                </button>
                <button
                  className="page-btn"
                  onClick={() => setLogsCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={logsCurrentPage === 1 || logsPageSize === -1}
                >
                  &larr; PREV
                </button>

                <span className="page-indicator">
                  PAGE <strong>{logsCurrentPage}</strong> OF <strong>{logsTotalPages}</strong>
                </span>

                <button
                  className="page-btn"
                  onClick={() => setLogsCurrentPage((prev) => Math.min(prev + 1, logsTotalPages))}
                  disabled={logsCurrentPage >= logsTotalPages || logsPageSize === -1}
                >
                  NEXT &rarr;
                </button>
                <button
                  className="page-btn"
                  onClick={() => setLogsCurrentPage(logsTotalPages)}
                  disabled={logsCurrentPage >= logsTotalPages || logsPageSize === -1}
                  title="Last Page"
                >
                  LAST &raquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIQUE ERRORS SUB-MODAL */}
      {showUniqueErrorsModal && (
        <div className="logs-modal-overlay" onClick={() => setShowUniqueErrorsModal(false)}>
          <div className="unique-errors-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">UNIQUE ERROR MESSAGES</h3>
                <p className="logs-modal-subtitle">
                  TOTAL UNIQUE ERRORS: <strong>{uniqueErrorMessages.length}</strong> &bull; CLICK ANY ERROR TO FILTER LOGS
                </p>
              </div>
              <button className="logs-modal-close" onClick={() => setShowUniqueErrorsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="logs-modal-body">
              {uniqueErrorMessages.length === 0 ? (
                <div className="empty-state">No error messages recorded in logs.</div>
              ) : (
                <div className="unique-error-list">
                  {uniqueErrorMessages.map((item, idx) => (
                    <div
                      key={idx}
                      className="unique-error-card"
                      onClick={() => {
                        setLogsSearch(item.message);
                        setShowUniqueErrorsModal(false);
                      }}
                    >
                      <div className="unique-error-info">
                        <div className="unique-error-title">
                          #{idx + 1}. {item.message}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <span className="unique-error-badge">
                          {item.count} {item.count === 1 ? "LOG" : "LOGS"}
                        </span>
                        <button className="filter-error-btn">FILTER</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALL-IN-ONE MOBILE FILTERS POPUP MODAL */}
      {showMobileFilterModal && (
        <div className="logs-modal-overlay" onClick={() => setShowMobileFilterModal(false)}>
          <div className="mobile-filter-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">FILTER PROPOSALS</h3>
                <p className="logs-modal-subtitle">APPLY SEARCH & CATEGORY FILTERS</p>
              </div>
              <button className="logs-modal-close" onClick={() => setShowMobileFilterModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="mobile-filter-modal-body">
              {/* STATUS FILTER */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">PROPOSAL STATUS</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL STATUSES</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* PLAN FILTER */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">PLAN</label>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL PLANS</option>
                  {planOptions.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </div>

              {/* BUSINESS TYPE FILTER */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">BUSINESS TYPE</label>
                <select
                  value={businessTypeFilter}
                  onChange={(e) => {
                    setBusinessTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL TYPES</option>
                  {businessTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* AGENT FILTER */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">AGENT NAME</label>
                <select
                  value={agentFilter}
                  onChange={(e) => {
                    setAgentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dropdown-select"
                >
                  <option value="ALL">ALL AGENTS</option>
                  {agentOptions.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOGIN DATE CALENDAR RANGE */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">LOGIN DATE RANGE</label>
                <CustomDateRangePicker
                  fromDate={loginDateFrom}
                  toDate={loginDateTo}
                  onChange={(from, to) => {
                    setLoginDateFrom(from);
                    setLoginDateTo(to);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* START DATE CALENDAR RANGE */}
              <div className="mobile-filter-group">
                <label className="mobile-filter-label">START DATE RANGE</label>
                <CustomDateRangePicker
                  fromDate={startDateFrom}
                  toDate={startDateTo}
                  onChange={(from, to) => {
                    setStartDateFrom(from);
                    setStartDateTo(to);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="mobile-filter-modal-footer">
              <button className="cal-action-btn clear" onClick={resetAllFilters}>
                RESET ALL
              </button>
              <button className="cal-action-btn apply" onClick={() => setShowMobileFilterModal(false)}>
                APPLY FILTERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {showManageCatModal && (
        <div className="logs-modal-overlay" onClick={() => setShowManageCatModal(false)}>
          <div className="mobile-filter-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">MANAGE CATEGORIES</h3>
                <p className="logs-modal-subtitle">CREATE, DELETE & SET PRIMARY CATEGORY (⭐)</p>
              </div>
              <button className="logs-modal-close" onClick={() => setShowManageCatModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="mobile-filter-modal-body">
              <div className="manage-cat-list">
                {userCategories.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>No categories created yet.</p>
                ) : (
                  userCategories.map((cat) => (
                    <div key={cat.id} className="manage-cat-item">
                      <div className="manage-cat-left">
                        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: cat.color }} />
                        <span className="manage-cat-name">{cat.name}</span>
                        {cat.isPrimary && (
                          <span style={{ fontSize: "0.65rem", color: "#ffd700", fontWeight: "bold" }}>
                            (PRIMARY)
                          </span>
                        )}
                      </div>
                      <div className="manage-cat-actions">
                        <button
                          className={`category-star-btn ${cat.isPrimary ? "primary" : ""}`}
                          title={cat.isPrimary ? "Primary Default Category" : "Set as Primary Default Category"}
                          onClick={(e) => togglePrimaryCategory(cat.id, e)}
                        >
                          <Star size={16} fill={cat.isPrimary ? "#ffd700" : "none"} />
                        </button>
                        <button
                          className="cat-delete-btn"
                          title="Delete Category"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCreateCategory} className="create-cat-form">
                <input
                  type="text"
                  placeholder="New Category Name (e.g. VIP Clients)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="create-cat-input"
                />
                <button type="submit" className="cal-action-btn apply">
                  + ADD
                </button>
              </form>
            </div>

            <div className="mobile-filter-modal-footer">
              <button className="cal-action-btn apply" style={{ width: "100%" }} onClick={() => setShowManageCatModal(false)}>
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSAL TAGGING MODAL */}
      {taggingProposalNo && (
        <div className="logs-modal-overlay" onClick={() => setTaggingProposalNo(null)}>
          <div className="mobile-filter-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="logs-modal-header">
              <div>
                <h3 className="logs-modal-title">TAG CATEGORIES</h3>
                <p className="logs-modal-subtitle">PROPOSAL: <code>{taggingProposalNo}</code></p>
              </div>
              <button className="logs-modal-close" onClick={() => setTaggingProposalNo(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="mobile-filter-modal-body">
              <div className="tag-modal-options">
                {userCategories.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>
                    No custom categories available. Click 'Manage Categories' to create one.
                  </p>
                ) : (
                  userCategories.map((cat) => {
                    const currentTags = proposalCategoriesMap[taggingProposalNo] || [];
                    const isChecked = currentTags.includes(cat.id);
                    return (
                      <label key={cat.id} className="tag-checkbox-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProposalCategory(taggingProposalNo, cat.id)}
                        />
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cat.color }} />
                        <span className="manage-cat-name">{cat.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mobile-filter-modal-footer">
              <button className="cal-action-btn apply" style={{ width: "100%" }} onClick={() => setTaggingProposalNo(null)}>
                SAVE TAGS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
