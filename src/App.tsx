import React, { useState, useEffect } from "react";
import { Voter } from "./types";
import SearchBox from "./components/SearchBox";
import VoterCard from "./components/VoterCard";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";
import {
  Shield,
  Search,
  Sparkles,
  Inbox,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Database,
  Heart,
  CloudOff
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api, getIsOfflineMode } from "./lib/api";

export default function App() {
  // App views
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [adminUsername, setAdminUsername] = useState<string | null>(localStorage.getItem("admin_username"));
  const [isOffline, setIsOffline] = useState(getIsOfflineMode());

  // Search filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  
  // Data lists
  const [voters, setVoters] = useState<Voter[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  
  // Loading states
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setIsVerifyingSession(false);
        return;
      }

      try {
        const data = await api.verifySession(token);
        setIsOffline(getIsOfflineMode());
        if (data.authenticated) {
          setAdminToken(token);
          setAdminUsername(data.username);
        } else {
          // Clear invalid session
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_username");
          setAdminToken(null);
          setAdminUsername(null);
        }
      } catch (err) {
        console.error("Session verification failed", err);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifySession();
  }, []);

  // Fetch unique voter areas
  const fetchAreas = async () => {
    setIsLoadingAreas(true);
    try {
      const data = await api.fetchAreas();
      setAreas(data);
      setIsOffline(getIsOfflineMode());
    } catch (err) {
      console.error("Failed to fetch areas", err);
    } finally {
      setIsLoadingAreas(false);
    }
  };

  // Fetch voters matching current filters
  const fetchVoters = async () => {
    setIsLoadingVoters(true);
    try {
      const data = await api.fetchVoters(searchQuery, searchField, selectedArea);
      setVoters(data);
      setIsOffline(getIsOfflineMode());
    } catch (err) {
      console.error("Failed to fetch voters", err);
    } finally {
      setIsLoadingVoters(false);
    }
  };

  // Load initial list of voters and areas on mount
  useEffect(() => {
    fetchAreas();
  }, [isOffline]);

  // Re-fetch voters whenever search parameters change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVoters();
    }, 250); // 250ms debouncing for fast instant searching

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchField, selectedArea, isOffline]);

  // Handle successful Admin Login
  const handleLoginSuccess = (token: string, username: string) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_username", username);
    setAdminToken(token);
    setAdminUsername(username);
    setIsOffline(getIsOfflineMode());
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await api.logout(token);
      } catch (err) {
        console.error("Logout request failed", err);
      }
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    setAdminToken(null);
    setAdminUsername(null);
    setIsAdminMode(false);
    setIsOffline(getIsOfflineMode());
  };

  // Handle edit voter on server
  const handleEditVoter = async (id: string, updated: Partial<Voter>): Promise<boolean> => {
    if (!adminToken) return false;
    try {
      const success = await api.editVoter(id, updated, adminToken);
      setIsOffline(getIsOfflineMode());
      if (success) {
        // Optimistically update frontend list
        setVoters((current) =>
          current.map((v) => (v.id === id ? { ...v, ...updated } : v))
        );
        fetchAreas(); // refresh unique areas
        return true;
      } else {
        alert("সংশোধন ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      alert("সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    }
    return false;
  };

  // Handle delete voter on server
  const handleDeleteVoter = async (id: string): Promise<boolean> => {
    if (!adminToken) return false;
    try {
      const success = await api.deleteVoter(id, adminToken);
      setIsOffline(getIsOfflineMode());
      if (success) {
        // Remove from local list
        setVoters((current) => current.filter((v) => v.id !== id));
        fetchAreas(); // refresh unique areas
        return true;
      } else {
        alert("মুছে ফেলা ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      alert("সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    }
    return false;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSearchField("all");
    setSelectedArea("All Areas");
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden" id="app-root">
      
      {/* 1. HIGH-DENSITY TOP HEADER / BRAND NAVIGATION */}
      <header className="h-16 bg-emerald-800 text-white flex items-center justify-between px-6 shrink-0 shadow-md relative z-10">
        
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner">
            <div className="w-5.5 h-5.5 border-4 border-emerald-600 rounded-full border-t-red-600 animate-spin-slow"></div>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white leading-tight font-display flex items-center gap-1.5">
              Voter Search BD
              <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase tracking-wider">v2.4</span>
            </h1>
            <p className="text-[10px] text-emerald-200 uppercase tracking-widest leading-none Bengali-font mt-0.5 font-medium">ELECTION COMMISSION INFORMATION SYSTEM</p>
          </div>
        </div>

        {/* Action Button Navigation */}
        <div className="flex items-center gap-2">
          {isAdminMode ? (
            <button
              onClick={() => setIsAdminMode(false)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700/50 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1.5 border border-emerald-600/30"
            >
              <Search className="w-3.5 h-3.5" />
              পাবলিক অনুসন্ধান (Public Search)
            </button>
          ) : (
            <button
              onClick={() => setIsAdminMode(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              {adminToken ? "অ্যাডমিন প্যানেল" : "অ্যাডমিন লগইন (Admin)"}
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN CORE DUAL-PANEL SECTION */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isVerifyingSession ? (
            <motion.div
              key="loading-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center bg-slate-50 space-y-3"
            >
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold text-slate-500">লোডিং হচ্ছে, অপেক্ষা করুন...</p>
            </motion.div>
          ) : isAdminMode ? (
            /* ================= ADMIN FULLSTAGE CONTAINER ================= */
            <motion.div
              key="admin-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col bg-slate-50 overflow-y-auto p-4 md:p-6"
            >
              {adminToken ? (
                <AdminPanel
                  token={adminToken}
                  onLogout={handleLogout}
                  onRefreshAreas={fetchAreas}
                />
              ) : (
                <div className="max-w-md w-full mx-auto my-12">
                  <AdminLogin onLoginSuccess={handleLoginSuccess} />
                </div>
              )}
            </motion.div>
          ) : (
            /* ================= PUBLIC DUAL-PANEL VIEW ================= */
            <motion.div
              key="search-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col md:flex-row overflow-hidden"
            >
              {/* Left Side: Sidebar Search Filters */}
              <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col shrink-0 overflow-y-auto">
                <SearchBox
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchField={searchField}
                  setSearchField={setSearchField}
                  selectedArea={selectedArea}
                  setSelectedArea={setSelectedArea}
                  areas={areas}
                  isLoadingAreas={isLoadingAreas}
                  onClear={clearFilters}
                />
              </aside>

              {/* Right Side: Results Panel */}
              <section className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                
                {/* High Density Statistics Header Bar */}
                <div className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
                  <div className="flex items-center gap-6 text-xs md:text-sm">
                    <span className="text-slate-500">
                      সার্চ ফলাফল: <strong className="text-slate-900 font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">{voters.length}</strong> টি রেকর্ড পাওয়া গেছে
                    </span>
                    <span className="text-slate-500 hidden sm:inline">
                      অনুসন্ধান মোড: <strong className="text-emerald-700">ডিজিটাল লাইভ ইনডেক্স</strong>
                    </span>
                  </div>
                  {voters.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden md:inline">এক্সপোর্ট:</span>
                      <a
                        href={isOffline ? "#" : `/api/voters/export?q=${encodeURIComponent(searchQuery)}&field=${searchField}&area=${encodeURIComponent(selectedArea)}&format=csv`}
                        onClick={(e) => {
                          if (isOffline) {
                            e.preventDefault();
                            const blob = new Blob([JSON.stringify(voters, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "voter_search_export.json";
                            a.click();
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        {isOffline ? "JSON" : "CSV"}
                      </a>
                      {!isOffline && (
                        <a
                          href={`/api/voters/export?q=${encodeURIComponent(searchQuery)}&field=${searchField}&area=${encodeURIComponent(selectedArea)}&format=json`}
                          className="text-[11px] font-bold text-blue-700 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          JSON
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {isOffline && (
                  <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-800 shrink-0">
                    <CloudOff className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span>
                      সিস্টেমটি <strong>অফলাইন মোডে (Standalone)</strong> চলছে। সকল ভোটার তথ্য ও প্রসেসিং ব্রাউজারের লোকাল স্টোরেজে (localStorage) হচ্ছে।
                    </span>
                    <button
                      onClick={() => {
                        api.setIsOfflineMode(false);
                        window.location.reload();
                      }}
                      className="ml-auto px-2.5 py-1 bg-white border border-amber-300 rounded font-bold text-[10px] hover:bg-amber-100 text-amber-700 transition-all cursor-pointer shadow-3xs"
                    >
                      সার্ভার পুনরায় চেষ্টা করুন (Retry Live Server)
                    </button>
                  </div>
                )}

                {/* Main Results Scroll Contain */}
                <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4">
                  
                  {/* Digital Portal Header Intro Banner */}
                  <div className="bg-emerald-900 text-white rounded-lg p-5 relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-950/20">
                    {/* Sun visual representing the sun in Bangladesh's flag */}
                    <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/35 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-1.5 max-w-xl text-center md:text-left">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-200 border border-white/10">
                        <Sparkles className="w-3 h-3" />
                        Gemini AI OCR Extracted
                      </div>
                      <h2 className="text-base md:text-lg font-bold tracking-tight">
                        ডিজিটাল ভোটার তালিকা অনুসন্ধান গেটওয়ে
                      </h2>
                      <p className="text-xs text-emerald-100 leading-relaxed font-light">
                        নির্বাচন কমিশনের ভোটার ডাটাবেজ আংশিক মিল অনুসন্ধান প্ল্যাটফর্ম। বাংলা অথবা ইংরেজি তথ্যাদি টাইপ করার সাথে সাথেই সেকেন্ডে নিখুঁত অনুসন্ধান ফলাফল প্রদর্শিত হয়।
                      </p>
                    </div>

                    {adminToken && (
                      <div className="relative z-10 shrink-0 bg-white/15 border border-white/10 px-3 py-1.5 rounded text-[11px] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-semibold text-white">অ্যাডমিন সেশন সচল</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Loader & List stage */}
                  {isLoadingVoters ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 animate-pulse">
                          <div className="flex justify-between items-center">
                            <div className="h-4 bg-slate-200 rounded w-1/3" />
                            <div className="h-5 bg-slate-200 rounded w-1/4" />
                          </div>
                          <div className="space-y-2 border-t border-slate-100 pt-2.5">
                            <div className="h-3 bg-slate-100 rounded w-4/5" />
                            <div className="h-3 bg-slate-100 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : voters.length === 0 ? (
                    /* Centered Empty Placeholder */
                    <div className="bg-white border border-dashed border-slate-200 rounded-lg py-12 px-4 text-center max-w-md mx-auto my-8">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">কোন ভোটার তালিকা পাওয়া যায়নি</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                        আপনার সার্চ কুয়েরি অথবা এলাকা ফিল্টারের সাথে সামঞ্জস্যপূর্ণ কোনো রেকর্ড মেলেনি। অন্য এলাকা সিলেক্ট করুন বা বানান সঠিক করুন।
                      </p>
                      {(searchQuery || selectedArea !== "All Areas") && (
                        <button
                          onClick={clearFilters}
                          className="mt-3.5 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                        >
                          ফিল্টার পরিষ্কার করুন
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Active Responsive Grid list */
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {voters.map((voter) => (
                        <VoterCard
                          key={voter.id}
                          voter={voter}
                          isAdmin={!!adminToken}
                          onEdit={handleEditVoter}
                          onDelete={handleDeleteVoter}
                        />
                      ))}
                    </div>
                  )}

                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. TECHNICAL METRIC SYSTEM-STATUS FOOTER */}
      <footer className="h-9 bg-slate-800 text-slate-400 px-6 flex items-center justify-between text-[10px] shrink-0 border-t border-slate-900 relative z-10 shadow-lg">
        <div className="flex items-center space-x-4">
          <span className="flex items-center font-medium">
            <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            {isOffline ? "Standalone Mode (অফলাইন মোড)" : "System Online (অনলাইন)"}
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline font-mono">Platform: {isOffline ? "Client Storage (HTML5)" : "Node.js (React)"}</span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">© {new Date().getFullYear()} Voter Search BD</span>
        </div>
        <div className="flex items-center space-x-3.5 text-slate-500">
          <span className="hidden lg:inline Bengali-font text-[9px]">গণপ্রজাতন্ত্রী বাংলাদেশ নির্বাচন কমিশন তথ্য ব্যবস্থা</span>
          <span className="hidden lg:inline">|</span>
          <span className="text-emerald-500 font-bold uppercase tracking-tighter italic font-mono">{isOffline ? "v2.4.0-STANDALONE" : "v2.4.0-PROD"}</span>
        </div>
      </footer>

    </div>
  );
}
