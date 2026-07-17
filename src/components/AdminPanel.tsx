import React, { useState, useEffect } from "react";
import { PDFRecord, AnalyticsStats } from "../types";
import {
  FileText,
  Upload,
  Link,
  RefreshCw,
  Trash2,
  Download,
  UploadCloud,
  Lock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Database,
  Eye,
  KeyRound,
  EyeOff,
  MapPin
} from "lucide-react";
import { api, getGoogleDriveId } from "../lib/api";

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
  onRefreshAreas: () => void;
}

export default function AdminPanel({ token, onLogout, onRefreshAreas }: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"pdfs" | "analytics" | "backup" | "security">("pdfs");

  // PDF Management states
  const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [inputAreaName, setInputAreaName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewDriveId, setPreviewDriveId] = useState<string | null>(null);

  // Analytics states
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Security states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMsg, setSecurityMsg] = useState({ text: "", type: "" });
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Backup & Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupMsg, setBackupMsg] = useState({ text: "", type: "" });

  // Status messages
  const [pdfMsg, setPdfMsg] = useState({ text: "", type: "" });

  // Fetch PDFs List
  const fetchPdfs = async () => {
    setIsLoadingPdfs(true);
    try {
      const data = await api.fetchPdfs(token);
      const sorted = data.sort((a: PDFRecord, b: PDFRecord) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPdfs(sorted);
      
      // Auto-preview the first available Google Drive PDF if none is active
      if (sorted.length > 0) {
        let foundDriveId = null;
        for (const pdf of sorted) {
          if (pdf.url) {
            const driveId = getGoogleDriveId(pdf.url);
            if (driveId) {
              foundDriveId = driveId;
              break;
            }
          }
        }
        if (foundDriveId) {
          setPreviewDriveId(prev => prev || foundDriveId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch PDFs", err);
    } finally {
      setIsLoadingPdfs(false);
    }
  };

  // Fetch Analytics Stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.fetchStats(token);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Poll for processing PDFs
  useEffect(() => {
    fetchPdfs();
    fetchStats();
    
    // Set up poller to automatically update PDF list when any file is in "processing" status
    const interval = setInterval(() => {
      setPdfs(currentPdfs => {
        const hasProcessing = currentPdfs.some(p => p.status === "processing");
        if (hasProcessing) {
          fetchPdfs();
          fetchStats();
          onRefreshAreas();
        }
        return currentPdfs;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setFileToUpload(file);
      } else {
        setPdfMsg({ text: "অনুগ্রহ করে কেবল PDF ফাইল আপলোড করুন।", type: "error" });
      }
    }
  };

  // Handle Local File Upload
  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setIsSubmitting(true);
    setPdfMsg({ text: "ফাইল আপলোড হচ্ছে এবং প্রসেসিং শুরু হয়েছে...", type: "info" });

    try {
      const data = await api.uploadPdf(fileToUpload, token);
      
      if (data.success) {
        setPdfMsg({ text: "ফাইলটি সফলভাবে গৃহীত হয়েছে। এটি ব্যাকগ্রাউন্ডে প্রসেস করা হচ্ছে।", type: "success" });
        setFileToUpload(null);
        fetchPdfs();
      } else {
        setPdfMsg({ text: data.error || "আপলোড ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err: any) {
      setPdfMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle URL Submission
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfUrl.trim()) return;
    if (!inputAreaName.trim()) {
      setPdfMsg({ text: "অনুগ্রহ করে এলাকার নাম লিখুন।", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setPdfMsg({ text: "লিংক ডাউনলোড এবং প্রসেসিং শুরু হয়েছে...", type: "info" });

    try {
      const data = await api.submitLink(pdfUrl, inputAreaName, token);
      
      if (data.success) {
        setPdfMsg({ text: "PDF লিংক গৃহীত হয়েছে। ব্যাকগ্রাউন্ডে ডাউনলোড ও প্রসেস শুরু হয়েছে।", type: "success" });
        // Check if it was Google Drive URL, set previewDriveId automatically to display it instantly!
        const driveId = getGoogleDriveId(pdfUrl);
        if (driveId) {
          setPreviewDriveId(driveId);
        }
        setPdfUrl("");
        setInputAreaName("");
        fetchPdfs();
        onRefreshAreas();
      } else {
        setPdfMsg({ text: data.error || "লিংক প্রসেসিং ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err) {
      setPdfMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete PDF and its voters
  const handleDeletePdf = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে আপনি "${name}" এবং এর অধীনে থাকা সমস্ত ভোটার তথ্য চিরতরে মুছে দিতে চান?`)) {
      return;
    }
    try {
      const success = await api.deletePdf(id, token);
      if (success) {
        setPdfMsg({ text: "ফাইল এবং ভোটার তথ্য সফলভাবে মুছে ফেলা হয়েছে।", type: "success" });
        fetchPdfs();
        fetchStats();
        onRefreshAreas();
      } else {
        setPdfMsg({ text: "মুছে ফেলা ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err) {
      setPdfMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    }
  };

  // Reprocess PDF Link
  const handleReprocessPdf = async (id: string) => {
    setPdfMsg({ text: "পুনরায় প্রসেসিং শুরু হচ্ছে...", type: "info" });
    try {
      const success = await api.reprocessPdf(id, token);
      if (success) {
        setPdfMsg({ text: "ব্যাকগ্রাউন্ডে পুনরায় প্রসেসিং শুরু হয়েছে।", type: "success" });
        fetchPdfs();
      } else {
        setPdfMsg({ text: "পুনরায় প্রসেসিং ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err) {
      setPdfMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    }
  };

  // Change Admin Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg({ text: "", type: "" });
    setIsUpdatingPass(true);

    try {
      const data = await api.changePassword(oldPassword, newPassword, token);
      if (data.success) {
        setSecurityMsg({ text: "পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।", type: "success" });
        setOldPassword("");
        setNewPassword("");
      } else {
        setSecurityMsg({ text: data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err) {
      setSecurityMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    } finally {
      setIsUpdatingPass(false);
    }
  };

  // Handle Restore Backup
  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    setIsRestoring(true);
    setBackupMsg({ text: "ডেটাবেস রিস্টোর করা হচ্ছে...", type: "info" });

    try {
      const data = await api.restoreBackup(restoreFile, token);
      if (data.success) {
        setBackupMsg({ text: "ডেটাবেস সফলভাবে রিস্টোর হয়েছে!", type: "success" });
        setRestoreFile(null);
        fetchPdfs();
        fetchStats();
        onRefreshAreas();
      } else {
        setBackupMsg({ text: data.error || "রিস্টোর ব্যর্থ হয়েছে।", type: "error" });
      }
    } catch (err) {
      setBackupMsg({ text: "সার্ভার সংযোগ ত্রুটি।", type: "error" });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[550px]">
      {/* Sidebar navigation */}
      <div className="bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-150 p-6 flex flex-col justify-between">
        <div>
          <div className="mb-6">
            <span className="text-xs font-bold text-bd-green-700 bg-bd-green-50 px-2.5 py-1 rounded border border-bd-green-600/10 tracking-widest uppercase font-display">
              Admin Portal
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-2 font-display">অ্যাডমিন ড্যাশবোর্ড</h3>
          </div>
          
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("pdfs")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
                activeTab === "pdfs"
                  ? "bg-bd-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              ভোটার ফাইল আপলোড
            </button>
            <button
              onClick={() => {
                setActiveTab("analytics");
                fetchStats();
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
                activeTab === "analytics"
                  ? "bg-bd-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              অনুসন্ধান অ্যানালিটিক্স
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
                activeTab === "backup"
                  ? "bg-bd-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Database className="w-4 h-4" />
              ব্যাকআপ ও রিস্টোর
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
                activeTab === "security"
                  ? "bg-bd-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Lock className="w-4 h-4" />
              নিরাপত্তা (Security)
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-200 mt-6 lg:mt-0">
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            লগ আউট (Logout)
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="col-span-3 p-6 md:p-8 flex flex-col justify-between">
        
        {/* 1. Voter files / PDF Processing Tab */}
        {activeTab === "pdfs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h4 className="text-base font-bold text-gray-900 font-display">PDF ভোটার তালিকা আপলোড করুন</h4>
                <p className="text-xs text-gray-500 mt-1">
                  ভোটার তালিকার স্ক্যানড বা ডিজিটাল PDF ফাইল আপলোড করুন। Gemini AI স্বয়ংক্রিয়ভাবে ভোটার রেকর্ড আলাদা করে সংরক্ষণ করবে।
                </p>
              </div>
              <button
                onClick={fetchPdfs}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                title="তালিক রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingPdfs ? "animate-spin" : ""}`} />
              </button>
            </div>

            {pdfMsg.text && (
              <div
                className={`p-4 rounded-xl text-sm border flex items-start gap-2.5 ${
                  pdfMsg.type === "success"
                    ? "bg-bd-green-50 text-bd-green-800 border-bd-green-200"
                    : pdfMsg.type === "error"
                    ? "bg-red-50 text-red-800 border-red-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                {pdfMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-bd-green-600 shrink-0 mt-0.5" />
                ) : pdfMsg.type === "error" ? (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>{pdfMsg.text}</div>
              </div>
            )}

            <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6 space-y-4">
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-bd-green-700 bg-bd-green-50 px-2 py-0.5 rounded uppercase tracking-wider font-display">
                    গুগল ড্রাইভ বা ওয়েব লিংক থেকে সরাসরি ভোটার তালিকা যোগ করুন
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">গুগল ড্রাইভ লিংক (ফাইল অথবা ফোল্ডার)</label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url"
                          placeholder="https://drive.google.com/drive/folders/... অথবা /file/d/..."
                          value={pdfUrl}
                          onChange={(e) => setPdfUrl(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 focus:border-bd-green-600 focus:ring-1 focus:ring-bd-green-600 rounded-xl text-sm bg-white outline-none font-sans"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">এলাকার নাম / কোড</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="এলাকার নাম লিখুন (যেমন: ৩৯০৮১৭ বা তারাগঞ্জ)"
                          value={inputAreaName}
                          onChange={(e) => setInputAreaName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 focus:border-bd-green-600 focus:ring-1 focus:ring-bd-green-600 rounded-xl text-sm bg-white outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mt-3.5 bg-white p-3 rounded-lg border border-gray-150">
                    💡 <strong>গুগল ড্রাইভ ফোল্ডার সাপোর্ট:</strong> আপনি চাইলে একটি সম্পূর্ণ গুগল ড্রাইভ ফোল্ডারের লিংক সাবমিট করতে পারেন। আমাদের সিস্টেম ফোল্ডারের ভেতরের সকল সাবফোল্ডার এবং পিডিএফ ফাইলগুলো স্বয়ংক্রিয়ভাবে স্ক্যান করে সব এলাকার ভোটার তালিকা ব্যাকগ্রাউন্ডে প্রসেস করে যুক্ত করে নিবে। অনুগ্রহ করে নিশ্চিত করুন লিংকটি <strong>\"Anyone with the link can view\"</strong> করা আছে।
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !pdfUrl.trim() || !inputAreaName.trim()}
                    className="px-6 py-3 bg-bd-green-600 hover:bg-bd-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        প্রসেস করা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        লিংক থেকে ভোটার তালিকা প্রসেস করুন
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* PDFs List */}
            <div className="space-y-3.5 pt-4">
              <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <Database className="w-4 h-4 text-bd-green-600" />
                আপলোড করা ভোটার ফাইলের প্রসেসিং রেকর্ড ({pdfs.length})
              </h5>
              
              {isLoadingPdfs && pdfs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-bd-green-600" />
                </div>
              ) : pdfs.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 border border-dashed rounded-xl text-gray-500 text-sm">
                  কোন ফাইল রেকর্ড পাওয়া যায়নি। প্রথম ভোটার তালিকা আপলোড করুন।
                </div>
              ) : (
                <div className="border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {pdfs.map((pdf) => {
                    const driveId = pdf.url ? getGoogleDriveId(pdf.url) : null;
                    return (
                      <div key={pdf.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate" title={pdf.filename}>
                              {pdf.filename}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span className="font-mono">ID: {pdf.id.substring(0, 8)}</span>
                              <span>•</span>
                              <span className="capitalize">
                                {pdf.sourceType === "link" ? (driveId ? "গুগল ড্রাইভ" : "URL লিংক") : "ফাইল আপলোড"}
                              </span>
                              <span>•</span>
                              <span>{new Date(pdf.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                          {/* Status badges */}
                          {pdf.status === "processing" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-500/15 rounded-lg">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              প্রসেসিং হচ্ছে
                            </span>
                          )}
                          {pdf.status === "success" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-bd-green-50 text-bd-green-700 border border-bd-green-500/15 rounded-lg">
                              <CheckCircle2 className="w-3 h-3 text-bd-green-600" />
                              সফল ({pdf.votersCount} ভোটার)
                            </span>
                          )}
                          {pdf.status === "error" && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-500/15 rounded-lg cursor-help relative group"
                              title={pdf.errorMessage || "ব্যর্থতা কারণ"}
                            >
                              <XCircle className="w-3 h-3 text-red-600" />
                              ব্যর্থ
                              {/* Error tooltip */}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-gray-900 text-white text-[10px] p-2 rounded shadow-md w-48 z-10 text-center font-normal leading-normal">
                                {pdf.errorMessage || "অজ্ঞাত ত্রুটি"}
                              </span>
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            {driveId && (
                              <button
                                onClick={() => setPreviewDriveId(driveId)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                                title="গুগল ড্রাইভ থেকে প্রিভিউ দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {pdf.sourceType === "link" && (
                              <button
                                onClick={() => handleReprocessPdf(pdf.id)}
                                disabled={pdf.status === "processing"}
                                className="p-1.5 text-gray-500 hover:text-bd-green-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="পুনরায় প্রসেস করুন"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePdf(pdf.id, pdf.filename)}
                              className="p-1.5 text-gray-500 hover:text-bd-red-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="ফাইল মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Embedded Google Drive PDF Viewer Modal Overlay */}
            {previewDriveId && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-slate-800 text-sm md:text-base">গুগল ড্রাইভ ভোটার ফাইল ভিউ (Google Drive Preview)</h4>
                    </div>
                    <button
                      onClick={() => setPreviewDriveId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      বন্ধ করুন (Close)
                    </button>
                  </div>
                  <div className="flex-1 bg-slate-100 relative">
                    <iframe
                      src={`https://drive.google.com/file/d/${previewDriveId}/preview`}
                      className="w-full h-full border-0"
                      allow="autoplay"
                      title="Google Drive Document Viewer"
                    />
                  </div>
                  <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => setPreviewDriveId(null)}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      ঠিক আছে (Done)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Analytics Dashboard Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h4 className="text-base font-bold text-gray-900 font-display">অনুসন্ধান অ্যানালিটিক্স ও ট্রেন্ডস</h4>
                <p className="text-xs text-gray-500 mt-1">ব্যবহারকারীদের করা ভোটার সার্চ সংক্রান্ত ডাটা অ্যানালিটিক্স রিপোর্ট।</p>
              </div>
              <button
                onClick={fetchStats}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStats ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isLoadingStats && !stats ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-7 h-7 animate-spin text-bd-green-600" />
              </div>
            ) : !stats ? (
              <div className="text-center py-10 text-gray-500">কোন অ্যানালিটিক্স ডাটা পাওয়া যায়নি।</div>
            ) : (
              <div className="space-y-6">
                {/* Dashboard grid metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">মোট ভোটার রেকর্ড</p>
                    <p className="text-3xl font-extrabold text-bd-green-700 mt-1 font-mono">{stats.totalVoters}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">মোট ফাইল/লিংক রেকর্ড</p>
                    <p className="text-3xl font-extrabold text-gray-800 mt-1 font-mono">{stats.totalPDFs}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">মোট সম্পন্ন অনুসন্ধান</p>
                    <p className="text-3xl font-extrabold text-gray-800 mt-1 font-mono">{stats.totalSearches}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Searches Bar Visualization */}
                  <div className="bg-white border border-gray-150 p-5 rounded-xl space-y-4">
                    <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                      <ChevronRight className="w-4 h-4 text-bd-green-600" />
                      সর্বাধিক খোঁজা শব্দসমূহ (Top Queries)
                    </h5>
                    
                    {stats.topQueries.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-10">কোনো সার্চ রেকর্ড নেই।</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topQueries.map((q, idx) => {
                          const maxCount = stats.topQueries[0]?.count || 1;
                          const percent = Math.round((q.count / maxCount) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-gray-700 truncate max-w-[180px] font-semibold">"{q.query}"</span>
                                <span className="text-gray-500 font-mono">{q.count} বার</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-bd-green-600 h-full rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Search Fields distribution */}
                  <div className="bg-white border border-gray-150 p-5 rounded-xl space-y-4">
                    <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                      <ChevronRight className="w-4 h-4 text-bd-green-600" />
                      সার্চ ক্যাটাগরি বিশ্লেষণ
                    </h5>
                    <div className="space-y-3">
                      {Object.entries(stats.fieldCounts).length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-10">কোনো ক্যাটাগরি বিশ্লেষণ নেই।</p>
                      ) : (
                        Object.entries(stats.fieldCounts)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .map(([field, count], idx) => {
                            const fieldLabels: Record<string, string> = {
                              all: "সব তথ্য (All)",
                              name: "ভোটার নাম (Name)",
                              fathersName: "পিতার নাম (Father)",
                              mothersName: "মাতার নাম (Mother)",
                              voterNo: "ভোটার আইডি নং (ID No)",
                              dob: "জন্ম তারিখ (DOB)",
                              address: "ঠিকানা (Address)"
                            };
                            const maxFieldCount = Math.max(...(Object.values(stats.fieldCounts) as number[]));
                            const percent = Math.round(((count as number) / (maxFieldCount || 1)) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-gray-700 font-semibold">{fieldLabels[field] || field}</span>
                                  <span className="text-gray-500 font-mono">{count} সার্চ</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-bd-red-600/80 h-full rounded-full transition-all"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Backup & Restore Tab */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900 font-display">ডেটাবেস ব্যাকআপ ও রিস্টোর</h4>
              <p className="text-xs text-gray-500 mt-1">আপনার ভোটার ডাটা সুরক্ষিত রাখতে ডেটাবেস ডাউনলোড বা রিস্টোর করুন।</p>
            </div>

            {backupMsg.text && (
              <div
                className={`p-4 rounded-xl text-sm border flex items-start gap-2.5 ${
                  backupMsg.type === "success"
                    ? "bg-bd-green-50 text-bd-green-800 border-bd-green-200"
                    : backupMsg.type === "error"
                    ? "bg-red-50 text-red-800 border-red-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                {backupMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-bd-green-600 shrink-0 mt-0.5" />
                ) : backupMsg.type === "error" ? (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>{backupMsg.text}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup section */}
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-bd-green-600" />
                    ব্যাকআপ ফাইল ডাউনলোড করুন
                  </h5>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    বর্তমান ভোটার তালিকা, আপলোড ফাইল মেটাডাটা, অনুসন্ধান অ্যানালিটিক্স সহ সম্পূর্ণ সিস্টেম ডেটা একটি JSON ফাইল আকারে ডাউনলোড করুন।
                  </p>
                </div>
                <a
                  href="/api/backup/download"
                  download
                  onClick={(e) => {
                    // Inject authorization token in fetch and let the browser download it
                    e.preventDefault();
                    setBackupMsg({ text: "ব্যাকআপ ফাইল জেনারেট হচ্ছে...", type: "info" });
                    fetch("/api/backup/download", {
                      headers: { Authorization: `Bearer ${token}` }
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error("Failed to download");
                        return res.blob();
                      })
                      .then((blob) => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `voter_search_bd_backup_${Date.now()}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setBackupMsg({ text: "ব্যাকআপ সফলভাবে ডাউনলোড করা হয়েছে।", type: "success" });
                      })
                      .catch((err) => {
                        setBackupMsg({ text: "ডাউনলোড ব্যর্থ হয়েছে।", type: "error" });
                      });
                  }}
                  className="w-full py-2.5 bg-bd-green-600 hover:bg-bd-green-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  নতুন ব্যাকআপ ডাউনলোড
                </a>
              </div>

              {/* Restore section */}
              <form onSubmit={handleRestoreBackup} className="bg-gray-50 border border-gray-200 p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-bd-red-600" />
                    ব্যাকআপ রিস্টোর করুন (Restore DB)
                  </h5>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    পূর্বে ডাউনলোড করা ব্যাকআপ JSON ফাইলটি আপলোড করুন। সতর্ক থাকুন: এটি আপনার বর্তমান সমস্ত ভোটার তথ্য এবং মেটাডাটা প্রতিস্থাপন করবে।
                  </p>
                  
                  <div className="mt-4">
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRestoreFile(e.target.files[0]);
                        }
                      }}
                      className="w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRestoring || !restoreFile}
                  className="w-full py-2.5 bg-bd-red-600 hover:bg-bd-red-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  {isRestoring ? "রিস্টোর হচ্ছে..." : "ডেটাবেস রিস্টোর করুন"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. Security Password Change Tab */}
        {activeTab === "security" && (
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
            <div className="pb-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900 font-display">অ্যাডমিন পাসওয়ার্ড পরিবর্তন</h4>
              <p className="text-xs text-gray-500 mt-1">আপনার সিকিউরিটি জোরদার করতে লগইন পাসওয়ার্ড নিয়মিত পরিবর্তন করুন।</p>
            </div>

            {securityMsg.text && (
              <div
                className={`p-3.5 rounded-xl text-sm border ${
                  securityMsg.type === "success"
                    ? "bg-bd-green-50 text-bd-green-800 border-bd-green-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {securityMsg.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">বর্তমান পাসওয়ার্ড (Current Password)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 focus:border-bd-green-600 rounded-lg text-sm bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">নতুন পাসওয়ার্ড (New Password)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 focus:border-bd-green-600 rounded-lg text-sm bg-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPass}
              className="w-full py-2.5 bg-bd-green-600 hover:bg-bd-green-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
            >
              <Lock className="w-4 h-4" />
              {isUpdatingPass ? "পরিবর্তন হচ্ছে..." : "নতুন পাসওয়ার্ড সংরক্ষণ করুন"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
