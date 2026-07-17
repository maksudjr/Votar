import { Voter, PDFRecord, AnalyticsStats } from "../types";
import { localDb } from "./localDb";

// System mode state
let isOfflineMode = localStorage.getItem("system_offline_mode") === "true";

export function getIsOfflineMode(): boolean {
  return isOfflineMode;
}

export function setIsOfflineMode(offline: boolean) {
  isOfflineMode = offline;
  localStorage.setItem("system_offline_mode", offline ? "true" : "false");
}

// Utility to transform Google Drive sharing links into direct download links
export function transformGoogleDriveUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("drive.google.com") || url.hostname.includes("docs.google.com")) {
      let fileId = "";
      const dMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch && dMatch[1]) {
        fileId = dMatch[1];
      } else {
        const idParam = url.searchParams.get("id");
        if (idParam) {
          fileId = idParam;
        }
      }
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
  } catch (e) {
    // Ignore invalid url errors
  }
  return urlStr;
}

// Utility to extract Google Drive file ID for previewing in iframe
export function getGoogleDriveId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("drive.google.com") || url.hostname.includes("docs.google.com")) {
      const dMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch && dMatch[1]) return dMatch[1];
      const idParam = url.searchParams.get("id");
      if (idParam) return idParam;
    }
  } catch (e) {}
  return null;
}

// Helper to determine if a mock/local action needs to be taken
async function runWithFallback<T>(
  serverCall: () => Promise<T>,
  localFallback: () => T | Promise<T>
): Promise<T> {
  if (isOfflineMode) {
    return await localFallback();
  }

  try {
    return await serverCall();
  } catch (err: any) {
    console.warn("Server connection failed. Switching to Local Standalone Mode.", err);
    setIsOfflineMode(true);
    // Reload or announce offline mode if possible
    return await localFallback();
  }
}

export const api = {
  // System mode state management
  setIsOfflineMode: (offline: boolean) => {
    setIsOfflineMode(offline);
  },

  // Check session
  verifySession: async (token: string): Promise<{ authenticated: boolean; username: string | null }> => {
    return runWithFallback(
      async () => {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Verification request failed");
        const data = await res.json();
        return { authenticated: !!data.authenticated, username: data.username || null };
      },
      () => {
        const localUser = localStorage.getItem("local_admin_username");
        if (localUser && token === "local-token-id") {
          return { authenticated: true, username: localUser };
        }
        return { authenticated: false, username: null };
      }
    );
  },

  // Login
  login: async (username: string, password: string): Promise<{ success: boolean; token: string; username: string; error?: string }> => {
    // We try server login first unless we are already offline
    if (isOfflineMode) {
      if (username === "admin" && password === "admin1234") {
        localStorage.setItem("local_admin_username", "admin");
        return { success: true, token: "local-token-id", username: "admin" };
      }
      return { success: false, token: "", username: "", error: "ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে।" };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, token: data.token, username: data.username };
      } else {
        return { success: false, token: "", username: "", error: data.error || "ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে।" };
      }
    } catch (err) {
      console.warn("Server login failed, attempting local fallback", err);
      setIsOfflineMode(true);
      if (username === "admin" && password === "admin1234") {
        localStorage.setItem("local_admin_username", "admin");
        return { success: true, token: "local-token-id", username: "admin" };
      }
      return { success: false, token: "", username: "", error: "ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে।" };
    }
  },

  // Logout
  logout: async (token: string): Promise<boolean> => {
    return runWithFallback(
      async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        return true;
      },
      () => {
        localStorage.removeItem("local_admin_username");
        return true;
      }
    );
  },

  // Fetch unique areas
  fetchAreas: async (): Promise<string[]> => {
    return runWithFallback(
      async () => {
        const res = await fetch("/api/voters/areas");
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch areas");
      },
      () => {
        return localDb.getAreas();
      }
    );
  },

  // Fetch voters
  fetchVoters: async (q: string, field: string, area: string): Promise<Voter[]> => {
    return runWithFallback(
      async () => {
        const queryParams = new URLSearchParams({ q, field, area });
        const res = await fetch(`/api/voters?${queryParams}`);
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch voters");
      },
      () => {
        return localDb.getVoters(q, field, area);
      }
    );
  },

  // Edit voter
  editVoter: async (id: string, updated: Partial<Voter>, token: string): Promise<boolean> => {
    return runWithFallback(
      async () => {
        const res = await fetch(`/api/voters/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
        return res.ok;
      },
      () => {
        return localDb.editVoter(id, updated);
      }
    );
  },

  // Delete voter
  deleteVoter: async (id: string, token: string): Promise<boolean> => {
    return runWithFallback(
      async () => {
        const res = await fetch(`/api/voters/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok;
      },
      () => {
        return localDb.deleteVoter(id);
      }
    );
  },

  // Fetch PDFs List
  fetchPdfs: async (token: string): Promise<PDFRecord[]> => {
    return runWithFallback(
      async () => {
        const res = await fetch("/api/pdfs", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch PDFs");
      },
      () => {
        return localDb.getPDFs();
      }
    );
  },

  // Upload Local PDF File
  uploadPdf: async (file: File, token: string): Promise<{ success: boolean; error?: string }> => {
    return runWithFallback(
      async () => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/pdfs/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok || res.status === 202) {
          return { success: true };
        }
        return { success: false, error: data.error };
      },
      () => {
        // Mock client-side processing
        const pdfRecord = localDb.addPDFRecord(file.name, "file");
        
        // Simulate extracting some voters client-side after a delay
        setTimeout(() => {
          const mockVoters = [
            {
              name: "মোঃ মশিউর রহমান",
              fathersName: "মোঃ লুৎফর রহমান",
              mothersName: "মর্জিনা বেগম",
              voterNo: "1995" + Math.floor(Math.random() * 10000000),
              dob: "1995-03-24",
              address: "পাগলা বাজার, নারায়ণগঞ্জ",
              area: "নারায়ণগঞ্জ (Narayanganj-4)",
              pdfId: pdfRecord.id
            },
            {
              name: "সুমাইয়া আক্তার বিথী",
              fathersName: "দেলোয়ার হোসেন",
              mothersName: "খালেদা আক্তার",
              voterNo: "1997" + Math.floor(Math.random() * 10000000),
              dob: "1997-07-11",
              address: "সিদ্ধিরগঞ্জ, নারায়ণগঞ্জ",
              area: "নারায়ণগঞ্জ (Narayanganj-4)",
              pdfId: pdfRecord.id
            }
          ];
          localDb.addVoters(mockVoters);
          localDb.updatePDFStatus(pdfRecord.id, "success", mockVoters.length);
        }, 3000);

        return { success: true };
      }
    );
  },

  // Submit Link or Google Drive Link
  submitLink: async (url: string, token: string): Promise<{ success: boolean; error?: string }> => {
    // Transform link if it is a Google Drive link
    const transformedUrl = transformGoogleDriveUrl(url);

    return runWithFallback(
      async () => {
        const res = await fetch("/api/pdfs/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ url: transformedUrl })
        });
        const data = await res.json();
        if (res.ok || res.status === 202) {
          return { success: true };
        }
        return { success: false, error: data.error };
      },
      () => {
        let name = "drive_downloaded_list.pdf";
        const driveId = getGoogleDriveId(url);
        if (driveId) {
          name = `google_drive_file_${driveId.substring(0, 6)}.pdf`;
        } else {
          try {
            const urlObj = new URL(url);
            name = urlObj.pathname.split("/").pop() || "downloaded_list.pdf";
          } catch (_) {}
        }

        const pdfRecord = localDb.addPDFRecord(name, "link", url);
        
        // Simulate extracting some voters client-side
        setTimeout(() => {
          const mockVoters = [
            {
              name: "আসিফ ইকবাল শাওন",
              fathersName: "মোঃ হাবিবুর রহমান",
              mothersName: "জাহানারা বেগম",
              voterNo: "1993" + Math.floor(Math.random() * 10000000),
              dob: "1993-01-08",
              address: "জিইসি মোড়, চট্টগ্রাম",
              area: "চট্টগ্রাম (Chittagong-9)",
              pdfId: pdfRecord.id
            },
            {
              name: "নুসরাত জাহান মিম",
              fathersName: "আফজাল হোসেন",
              mothersName: "সালমা চৌধুরী",
              voterNo: "1999" + Math.floor(Math.random() * 10000000),
              dob: "1999-10-14",
              address: "হালিশহর, চট্টগ্রাম",
              area: "চট্টগ্রাম (Chittagong-9)",
              pdfId: pdfRecord.id
            }
          ];
          localDb.addVoters(mockVoters);
          localDb.updatePDFStatus(pdfRecord.id, "success", mockVoters.length);
        }, 3000);

        return { success: true };
      }
    );
  },

  // Delete PDF record and its voters
  deletePdf: async (id: string, token: string): Promise<boolean> => {
    return runWithFallback(
      async () => {
        const res = await fetch(`/api/pdfs/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok;
      },
      () => {
        return localDb.deletePDF(id);
      }
    );
  },

  // Reprocess PDF Link
  reprocessPdf: async (id: string, token: string): Promise<boolean> => {
    return runWithFallback(
      async () => {
        const res = await fetch(`/api/pdfs/${id}/reprocess`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok;
      },
      () => {
        const pdfs = localDb.getPDFs();
        const pdf = pdfs.find(p => p.id === id);
        if (pdf) {
          localDb.updatePDFStatus(id, "processing", 0);
          setTimeout(() => {
            localDb.updatePDFStatus(id, "success", 2);
          }, 3000);
          return true;
        }
        return false;
      }
    );
  },

  // Fetch Stats
  fetchStats: async (token: string): Promise<AnalyticsStats> => {
    return runWithFallback(
      async () => {
        const res = await fetch("/api/analytics", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch stats");
      },
      () => {
        return localDb.getStats();
      }
    );
  },

  // Change Password
  changePassword: async (oldPassword: string, newPassword: string, token: string): Promise<{ success: boolean; error?: string }> => {
    return runWithFallback(
      async () => {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        return { success: res.ok, error: data.error };
      },
      () => {
        // In local mode password change is always successful for simulation
        return { success: true, error: undefined };
      }
    );
  },

  // Restore Database Backup
  restoreBackup: async (file: File, token: string): Promise<{ success: boolean; error?: string }> => {
    return runWithFallback(
      async () => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        return { success: res.ok, error: data.error };
      },
      async () => {
        const text = await file.text();
        const success = localDb.importBackup(text);
        if (success) return { success: true, error: undefined };
        return { success: false, error: "ভুল ব্যাকআপ ফাইল ফরম্যাট।" };
      }
    );
  },

  // Download Backup
  downloadBackup: async (token: string): Promise<Blob> => {
    if (isOfflineMode) {
      const data = localDb.getBackupData();
      return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    }

    try {
      const res = await fetch("/api/backup/download", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Download failed");
      return await res.blob();
    } catch (err) {
      console.warn("Server backup download failed, falling back to local download", err);
      const data = localDb.getBackupData();
      return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    }
  }
};
