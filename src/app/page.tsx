"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
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
  Folder
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

  // Load Categories & Proposal Assignments from localStorage on mount
  useEffect(() => {
    try {
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

  const fetchLogs = useCallback(async () => {
    try {
      const { data: logsData } = await supabase
        .from("faveo_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (logsData) {
        setFaveoLogs(logsData);
      }
    } catch (e) {
      console.error("Error loading faveo_logs", e);
    }
  }, []);

  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const { data } = await supabase.from("faveo_data").select("proposal_status, plan, business_type, agent_name").limit(1000);
        if (data) {
          const statuses = Array.from(new Set(data.map((item: any) => item.proposal_status).filter(Boolean))) as string[];
          const plans = Array.from(new Set(data.map((item: any) => item.plan).filter(Boolean))) as string[];
          const types = Array.from(new Set(data.map((item: any) => item.business_type).filter(Boolean))) as string[];
          const agents = Array.from(new Set(data.map((item: any) => item.agent_name).filter(Boolean))) as string[];

          setStatusOptions(statuses.sort());
          setPlanOptions(plans.sort());
          setBusinessTypeOptions(types.sort());
          setAgentOptions(agents.sort());
        }
      } catch (e) {
        console.error("Error loading filter options", e);
      }
    }

    fetchFilterOptions();
    fetchLogs();

    // Auto-refresh faveo_logs every 1 minute (60,000 ms)
    const intervalId = setInterval(() => {
      fetchLogs();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchLogs]);

  const [allProposals, setAllProposals] = useState<ProposalRecord[]>([]);

  // 1. Fetch ALL records from Supabase ONCE on page mount
  const fetchAllProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("faveo_data")
        .select("*")
        .order("updated_at", { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setAllProposals(data || []);
    } catch (err: any) {
      console.error("Error fetching proposals:", err);
      setError(err.message || "Failed to load proposals data from Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProposals();
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

  return (
    <div className="proposals-page-wrapper">
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
          <button className="retry-btn" onClick={fetchAllProposals}>RETRY</button>
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
                  <th>PAYMENT (₹)</th>
                  <th>GWP (₹)</th>
                  <th>LOGIN DATE</th>
                  <th>START DATE</th>
                  <th>LIVES</th>
                  <th>TYPE</th>
                  <th>AGENT NAME</th>
                  <th>CATEGORIES</th>
                  <th>UPDATED AT</th>
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
                      <td className="col-amount">
                        {item.payment_amount ? `₹${Number(item.payment_amount).toLocaleString()}` : "-"}
                      </td>
                      <td className="col-amount">
                        {item.gwp ? `₹${Number(item.gwp).toLocaleString()}` : "-"}
                      </td>
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
                <p className="logs-modal-subtitle">DATABASE TABLE: <code>faveo_logs</code></p>
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
                    {faveoLogs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="col-center">No logs recorded in faveo_logs table.</td>
                      </tr>
                    ) : (
                      faveoLogs.map((log, idx) => (
                        <tr key={log.id || idx}>
                          <td className="col-idx">{idx + 1}</td>
                          <td><code>{log.id || "-"}</code></td>
                          <td><strong>{log.agent_name || "-"}</strong></td>
                          <td><code>{log.agent_id || "-"}</code></td>
                          <td>
                            <span className={`status-badge ${log.status?.toLowerCase() === "success" ? "status-inforce" : "status-other"}`}>
                              {log.status || "-"}
                            </span>
                          </td>
                          <td className="col-amount">{log.total_records ?? 0}</td>
                          <td className="col-amount">{log.uploaded_records ?? 0}</td>
                          <td>{log.start_date || "-"}</td>
                          <td>{log.end_date || "-"}</td>
                          <td className="col-time">{log.error_message || "None"}</td>
                          <td className="col-time">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
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
