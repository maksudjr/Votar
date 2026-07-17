import { Voter, PDFRecord, AnalyticsStats } from "../types";

// Seed data of realistic voters in Bangla so that the search looks gorgeous out-of-the-box
const SEED_VOTERS: Voter[] = [
  {
    id: "voter-1",
    name: "মোঃ আবদুর রহমান",
    fathersName: "মোঃ মফিজুল ইসলাম",
    mothersName: "রহিমা বেগম",
    voterNo: "19942610507000123",
    dob: "1994-05-12",
    address: "বাসা নং ১২, রোড নং ৩, বনানী, ঢাকা",
    area: "বনানী (Dhaka-17)",
    pdfId: "seed-pdf"
  },
  {
    id: "voter-2",
    name: "ফাতেমা জান্নাত নদী",
    fathersName: "আবদুল করিম",
    mothersName: "আয়শা খাতুন",
    voterNo: "19982610507000456",
    dob: "1998-11-20",
    address: "গ্রাম: হরিতলা, ডাকঘর: মির্জাপুর, টাঙ্গাইল",
    area: "মির্জাপুর (Tangail-7)",
    pdfId: "seed-pdf"
  },
  {
    id: "voter-3",
    name: "সজীব আহমেদ সানি",
    fathersName: "মোঃ রফিকুল ইসলাম",
    mothersName: "নুরজাহান বেগম",
    voterNo: "19912610507000789",
    dob: "1991-02-15",
    address: "হোল্ডিং নং ৪৫, দক্ষিণখান, ঢাকা",
    area: "দক্ষিণখান (Dhaka-18)",
    pdfId: "seed-pdf"
  },
  {
    id: "voter-4",
    name: "তাসমিয়া আক্তার প্রিয়া",
    fathersName: "মোজাম্মেল হক",
    mothersName: "শাহনাজ বেগম",
    voterNo: "20012610507000234",
    dob: "2001-08-30",
    address: "পৌরসভা ব্লক বি, চান্দিনা, কুমিল্লা",
    area: "চান্দিনা (Comilla-7)",
    pdfId: "seed-pdf"
  },
  {
    id: "voter-5",
    name: "কাজী মোরশেদ আলম",
    fathersName: "কাজী আনোয়ার হোসেন",
    mothersName: "কাজী শামীমা আক্তার",
    voterNo: "19872610507000890",
    dob: "1987-04-05",
    address: "সেক্টর ৪, রোড ৯, উত্তরা, ঢাকা",
    area: "উত্তরা (Dhaka-18)",
    pdfId: "seed-pdf"
  }
];

const SEED_PDFS: PDFRecord[] = [
  {
    id: "seed-pdf",
    filename: "dhaka_voter_list_2026.pdf",
    sourceType: "file",
    status: "success",
    votersCount: 5,
    createdAt: new Date().toISOString()
  }
];

// Initialize database in localStorage
function getLocalState() {
  const votersStr = localStorage.getItem("local_voters");
  const pdfsStr = localStorage.getItem("local_pdfs");
  const analyticsStr = localStorage.getItem("local_analytics");
  
  let voters = votersStr ? JSON.parse(votersStr) : [];
  let pdfs = pdfsStr ? JSON.parse(pdfsStr) : [];
  let analytics = analyticsStr ? JSON.parse(analyticsStr) : [];

  // Seed if empty
  if (voters.length === 0 && pdfs.length === 0) {
    voters = [...SEED_VOTERS];
    pdfs = [...SEED_PDFS];
    localStorage.setItem("local_voters", JSON.stringify(voters));
    localStorage.setItem("local_pdfs", JSON.stringify(pdfs));
  }

  return { voters, pdfs, analytics };
}

function saveLocalState(voters: Voter[], pdfs: PDFRecord[], analytics: any[]) {
  localStorage.setItem("local_voters", JSON.stringify(voters));
  localStorage.setItem("local_pdfs", JSON.stringify(pdfs));
  localStorage.setItem("local_analytics", JSON.stringify(analytics));
}

export const localDb = {
  getVoters: (q?: string, field?: string, area?: string): Voter[] => {
    const { voters } = getLocalState();
    let result = [...voters];

    if (area && area !== "All Areas") {
      result = result.filter(v => v.area === area);
    }

    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      result = result.filter(v => {
        if (field === "name") return v.name.toLowerCase().includes(query);
        if (field === "fathersName") return v.fathersName.toLowerCase().includes(query);
        if (field === "mothersName") return v.mothersName.toLowerCase().includes(query);
        if (field === "voterNo") return v.voterNo.toLowerCase().includes(query);
        if (field === "dob") return v.dob.toLowerCase().includes(query);
        if (field === "address") return v.address.toLowerCase().includes(query);
        
        // "all" field search
        return (
          v.name.toLowerCase().includes(query) ||
          v.fathersName.toLowerCase().includes(query) ||
          v.mothersName.toLowerCase().includes(query) ||
          v.voterNo.toLowerCase().includes(query) ||
          v.dob.toLowerCase().includes(query) ||
          v.address.toLowerCase().includes(query) ||
          v.area.toLowerCase().includes(query)
        );
      });
    }

    // Log analytic search
    if (q && q.trim()) {
      const { voters: vList, pdfs: pList, analytics: aList } = getLocalState();
      aList.push({
        id: "analytic-" + Math.random().toString(36).substring(2),
        query: q,
        searchField: field || "all",
        resultsCount: result.length,
        timestamp: new Date().toISOString()
      });
      if (aList.length > 500) aList.shift();
      localStorage.setItem("local_analytics", JSON.stringify(aList));
    }

    return result;
  },

  getAreas: (): string[] => {
    const { voters } = getLocalState();
    const areasSet = new Set(voters.map(v => v.area).filter(Boolean));
    return Array.from(areasSet) as string[];
  },

  editVoter: (id: string, updated: Partial<Voter>): boolean => {
    const { voters, pdfs, analytics } = getLocalState();
    const idx = voters.findIndex(v => v.id === id);
    if (idx === -1) return false;
    voters[idx] = { ...voters[idx], ...updated };
    saveLocalState(voters, pdfs, analytics);
    return true;
  },

  deleteVoter: (id: string): boolean => {
    const { voters, pdfs, analytics } = getLocalState();
    const filtered = voters.filter(v => v.id !== id);
    if (filtered.length === voters.length) return false;
    saveLocalState(filtered, pdfs, analytics);
    return true;
  },

  getPDFs: (): PDFRecord[] => {
    const { pdfs } = getLocalState();
    return pdfs;
  },

  addPDFRecord: (filename: string, sourceType: "file" | "link", url?: string): PDFRecord => {
    const { voters, pdfs, analytics } = getLocalState();
    const record: PDFRecord = {
      id: "pdf-" + Math.random().toString(36).substring(2),
      filename,
      sourceType,
      url,
      status: "processing",
      votersCount: 0,
      createdAt: new Date().toISOString()
    };
    pdfs.push(record);
    saveLocalState(voters, pdfs, analytics);
    return record;
  },

  updatePDFStatus: (id: string, status: "processing" | "success" | "error", votersCount: number, errorMsg?: string): void => {
    const { voters, pdfs, analytics } = getLocalState();
    const pdf = pdfs.find(p => p.id === id);
    if (pdf) {
      pdf.status = status;
      pdf.votersCount = votersCount;
      if (errorMsg) pdf.errorMessage = errorMsg;
      saveLocalState(voters, pdfs, analytics);
    }
  },

  deletePDF: (id: string): boolean => {
    const { voters, pdfs, analytics } = getLocalState();
    const filteredVoters = voters.filter(v => v.pdfId !== id);
    const filteredPDFs = pdfs.filter(p => p.id !== id);
    saveLocalState(filteredVoters, filteredPDFs, analytics);
    return true;
  },

  getStats: (): AnalyticsStats => {
    const { voters, pdfs, analytics } = getLocalState();
    
    // Group queries
    const queryCounts: Record<string, number> = {};
    analytics.forEach((a: any) => {
      queryCounts[a.query] = (queryCounts[a.query] || 0) + 1;
    });
    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Group fields
    const fieldCounts: Record<string, number> = {
      all: 0, name: 0, fathersName: 0, mothersName: 0, voterNo: 0, dob: 0, address: 0
    };
    analytics.forEach((a: any) => {
      if (a.searchField in fieldCounts) {
        fieldCounts[a.searchField]++;
      } else {
        fieldCounts[a.searchField] = 1;
      }
    });

    return {
      totalVoters: voters.length,
      totalPDFs: pdfs.length,
      totalSearches: analytics.length,
      topQueries,
      fieldCounts
    };
  },

  importBackup: (backupText: string): boolean => {
    try {
      const data = JSON.parse(backupText);
      if (Array.isArray(data.voters) && Array.isArray(data.pdfs)) {
        localStorage.setItem("local_voters", JSON.stringify(data.voters));
        localStorage.setItem("local_pdfs", JSON.stringify(data.pdfs));
        if (Array.isArray(data.analytics)) {
          localStorage.setItem("local_analytics", JSON.stringify(data.analytics));
        }
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  getBackupData: () => {
    const { voters, pdfs, analytics } = getLocalState();
    return { voters, pdfs, analytics };
  },

  addVoters: (newVoters: Omit<Voter, "id">[]): number => {
    const { voters, pdfs, analytics } = getLocalState();
    const votersWithIds = newVoters.map(nv => ({
      ...nv,
      id: "voter-" + Math.random().toString(36).substring(2)
    }));
    const updatedVoters = [...voters, ...votersWithIds];
    saveLocalState(updatedVoters, pdfs, analytics);
    return votersWithIds.length;
  }
};
