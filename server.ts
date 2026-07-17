import express from "express";
import path from "path";
import multer from "multer";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import {
  initDb,
  validateAdmin,
  updateAdminPassword,
  searchVoters,
  getUniqueAreas,
  addVoters,
  editVoter,
  deleteVoter,
  getPDFs,
  addPDFRecord,
  updatePDFStatus,
  deletePDF,
  logSearch,
  getAnalyticsStats,
  getBackupData,
  restoreDatabase
} from "./src/server/db";
import { extractVotersFromPDF } from "./src/server/gemini";
import { processGoogleDriveFolderBackground } from "./src/server/driveFolderScanner";

const app = express();
const PORT = 3000;

// Configure body-parser with high limits to handle backups/file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Standard Request Logger Middleware for console logs on live servers
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Configure multer for PDF file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Simple in-memory session store
const sessions = new Map<string, { username: string; expires: number }>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expires < now) {
      sessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

// Admin authentication middleware
function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing admin token." });
  }
  const token = authHeader.substring(7);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ error: "Session expired or invalid." });
  }
  req.user = session;
  next();
}

// Ensure database is initialized
initDb().then(() => {
  console.log("Database online.");
}).catch(err => {
  console.error("Database connection failure:", err);
});

// ---------------------- PUBLIC ENDPOINTS ----------------------

// 1. Search Voters
app.get("/api/voters", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    const field = (req.query.field as string) || "all";
    const area = (req.query.area as string) || "All Areas";
    
    const results = await searchVoters(query, field, area);
    
    // Log search query for analytics (non-blocking to prevent server-side IO bottlenecks or failures)
    logSearch(query, field, results.length).catch(err => {
      console.error(`[Error] Failed to log search analytics for query "${query}":`, err);
    });
    
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to search voters" });
  }
});

// 2. Get Unique Areas
app.get("/api/voters/areas", async (req, res) => {
  try {
    const areas = await getUniqueAreas();
    res.json(areas);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch areas" });
  }
});

// 3. Admin Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    
    const user = await validateAdmin(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    
    const token = crypto.randomUUID();
    sessions.set(token, {
      username: user.username,
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ success: true, token, username: user.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

// 4. Admin Auth Check (Me)
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.substring(7);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, username: session.username });
});

// 5. Admin Logout
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    sessions.delete(token);
  }
  res.json({ success: true });
});

// ---------------------- ADMIN-ONLY ENDPOINTS ----------------------

// 6. Change Password
app.post("/api/auth/change-password", requireAdmin, async (req: any, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new passwords are required." });
    }
    
    const success = await updateAdminPassword(username, oldPassword, newPassword);
    if (!success) {
      return res.status(400).json({ error: "Incorrect old password." });
    }
    
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update password" });
  }
});

// 7. Edit Voter Record
app.put("/api/voters/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fathersName, mothersName, voterNo, dob, address, area } = req.body;
    
    if (!name || !voterNo) {
      return res.status(400).json({ error: "Name and Voter Number are required." });
    }
    
    const success = await editVoter(id, { name, fathersName, mothersName, voterNo, dob, address, area });
    if (!success) {
      return res.status(404).json({ error: "Voter record not found." });
    }
    
    res.json({ success: true, message: "Voter record updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update voter record" });
  }
});

// 8. Delete Voter Record
app.delete("/api/voters/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteVoter(id);
    if (!success) {
      return res.status(404).json({ error: "Voter record not found." });
    }
    res.json({ success: true, message: "Voter record deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete voter record" });
  }
});

// 9. Get Uploaded PDFs List
app.get("/api/pdfs", requireAdmin, async (req, res) => {
  try {
    const pdfs = await getPDFs();
    res.json(pdfs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch PDFs" });
  }
});

// Helper: Run background Gemini PDF extraction
async function triggerPdfProcessing(pdfId: string, pdfBuffer: Buffer, originalName: string, areaName?: string) {
  try {
    console.log(`Starting background parsing for PDF ${pdfId}: ${originalName}`);
    const extractedVoters = await extractVotersFromPDF(pdfBuffer, originalName);
    
    // Structure extracted voters for DB insertion
    const votersToSave = extractedVoters.map(ev => ({
      name: ev.name || "",
      fathersName: ev.fathersName || "",
      mothersName: ev.mothersName || "",
      voterNo: ev.voterNo || "",
      dob: ev.dob || "",
      address: ev.address || "",
      area: areaName || ev.area || "Unknown Area",
      pdfId
    }));

    // Save to DB
    const count = await addVoters(votersToSave);
    
    // Update PDF record status
    await updatePDFStatus(pdfId, "success", count);
    console.log(`Successfully completed background parsing for PDF ${pdfId}. Saved ${count} voters.`);
  } catch (err: any) {
    console.error(`Error in background parsing for PDF ${pdfId}:`, err);
    await updatePDFStatus(pdfId, "error", 0, err.message || "Unknown extraction error");
  }
}

// 10. Admin PDF File Upload
app.post("/api/pdfs/upload", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a valid PDF file." });
    }
    
    const record = await addPDFRecord(req.file.originalname, "file");
    
    // Trigger extraction in the background to prevent client timeouts
    triggerPdfProcessing(record.id, req.file.buffer, req.file.originalname);
    
    res.status(202).json({
      message: "PDF uploaded and processing started in background.",
      pdf: record
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to upload PDF" });
  }
});

// 11. Admin PDF Link Submit
app.post("/api/pdfs/link", requireAdmin, async (req, res) => {
  try {
    const { url, areaName } = req.body;
    if (!url) {
      return res.status(400).json({ error: "PDF URL is required." });
    }
    if (!areaName) {
      return res.status(400).json({ error: "Area Name is required." });
    }
    
    // Detect Google Drive Folder Link
    let isFolder = false;
    let folderId = "";
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("drive.google.com")) {
        const folderMatch = urlObj.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (folderMatch && folderMatch[1]) {
          isFolder = true;
          folderId = folderMatch[1];
        }
      }
    } catch (_) {}

    if (isFolder) {
      // Trigger background processing for the Google Drive folder tree
      processGoogleDriveFolderBackground(folderId, areaName);
      
      return res.status(202).json({
        message: "গুগল ড্রাইভ ফোল্ডার লিংক সনাক্ত করা হয়েছে! ব্যাকগ্রাউন্ডে ফোল্ডারের ভেতরের সকল পিডিএফ এবং সাবফোল্ডার স্ক্যান করে প্রসেস করা হচ্ছে।",
        pdf: {
          id: folderId,
          filename: `ফোল্ডার: ${areaName}`,
          sourceType: "link",
          status: "processing",
          votersCount: 0,
          createdAt: new Date().toISOString()
        }
      });
    }
    
    // Try to infer a nice filename from the URL
    let filename = "downloaded_list.pdf";
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const base = pathname.substring(pathname.lastIndexOf("/") + 1);
      if (base && base.toLowerCase().endsWith(".pdf")) {
        filename = base;
      }
    } catch (_) {}
    
    const record = await addPDFRecord(filename, "link", url);
    
    // Trigger download & extraction in the background
    (async () => {
      try {
        console.log(`Downloading PDF from link in background: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download PDF. Status code: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        await triggerPdfProcessing(record.id, buffer, filename, areaName);
      } catch (err: any) {
        console.error(`Link processing background error for ${record.id}:`, err);
        await updatePDFStatus(record.id, "error", 0, err.message || "Download failed");
      }
    })();
    
    res.status(202).json({
      message: "PDF link accepted. Downloading and processing in background.",
      pdf: record
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process PDF link" });
  }
});

// 12. Reprocess PDF
app.post("/api/pdfs/:id/reprocess", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pdfs = await getPDFs();
    const pdf = pdfs.find(p => p.id === id);
    if (!pdf) {
      return res.status(404).json({ error: "PDF record not found." });
    }
    
    // If it's a file sourceType, we can't reprocess without storing the original file buffer.
    // For a better user experience, we notify them we can easily download links, or they can re-upload.
    // However, if we do keep it, let's allow reprocessing. Since we do not save files permanently in filesystem to save disk space,
    // we can reprocess if it was a link. If it was a uploaded file, they can re-upload it.
    if (pdf.sourceType === "link" && pdf.url) {
      // Set back to processing
      await updatePDFStatus(id, "processing", 0);
      
      // Trigger download & extraction
      (async () => {
        try {
          const response = await fetch(pdf.url!);
          if (!response.ok) {
            throw new Error(`Reprocess: Failed to download PDF. Status: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Clear previous voters of this PDF before reprocessing
          await deletePDF(id);
          // Re-create the PDF record
          const record = await addPDFRecord(pdf.filename, "link", pdf.url);
          await triggerPdfProcessing(record.id, buffer, pdf.filename);
        } catch (err: any) {
          await updatePDFStatus(id, "error", 0, err.message || "Reprocessing failed");
        }
      })();
      
      res.json({ success: true, message: "Reprocessing started in background." });
    } else {
      res.status(400).json({ error: "Reprocessing is only supported for URL-sourced PDFs. For file uploads, please upload the file again." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Reprocessing failed" });
  }
});

// 13. Delete PDF and its voters
app.delete("/api/pdfs/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deletePDF(id);
    if (!success) {
      return res.status(404).json({ error: "PDF record not found." });
    }
    res.json({ success: true, message: "PDF and its extracted voter records deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete PDF" });
  }
});

// 14. Get Analytics Dashboard Stats
app.get("/api/analytics", requireAdmin, async (req, res) => {
  try {
    const stats = await getAnalyticsStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch analytics" });
  }
});

// 15. Download Database Backup (JSON)
app.get("/api/backup/download", requireAdmin, async (req, res) => {
  try {
    const data = await getBackupData();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=voter_search_bd_backup_${Date.now()}.json`);
    res.send(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to download backup" });
  }
});

// 16. Restore Database Backup (JSON)
app.post("/api/backup/restore", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a valid JSON backup file." });
    }
    
    const jsonString = req.file.buffer.toString("utf-8");
    const success = await restoreDatabase(jsonString);
    
    if (!success) {
      return res.status(400).json({ error: "Invalid backup file structure." });
    }
    
    res.json({ success: true, message: "Database restored successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to restore database" });
  }
});

// 17. Search Results Export (CSV / JSON)
app.get("/api/voters/export", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    const field = (req.query.field as string) || "all";
    const area = (req.query.area as string) || "All Areas";
    const format = (req.query.format as string) || "csv";
    
    const results = await searchVoters(query, field, area);
    
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=voter_search_export_${Date.now()}.json`);
      return res.send(JSON.stringify(results, null, 2));
    } else {
      // CSV Export
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=voter_search_export_${Date.now()}.csv`);
      
      // UTF-8 BOM to ensure Excel opens Bangla characters properly
      res.write("\ufeff");
      
      const headers = ["ID", "Name", "Father's Name", "Mother's Name", "Voter Number", "Date of Birth", "Address", "Area"];
      res.write(headers.join(",") + "\n");
      
      results.forEach(v => {
        const row = [
          v.id,
          v.name,
          v.fathersName,
          v.mothersName,
          v.voterNo,
          v.dob,
          v.address,
          v.area
        ].map(val => {
          // Escape quotes and wrap in quotes for clean CSV
          const strVal = String(val || "").replace(/"/g, '""');
          return `"${strVal}"`;
        });
        res.write(row.join(",") + "\n");
      });
      
      return res.end();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to export search results" });
  }
});

// ---------------------- VITE & STATIC FILE SERVING ----------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Mount Vite's HMR middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve compiled static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voter Search BD Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
