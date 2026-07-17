import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface Voter {
  id: string;
  name: string;
  fathersName: string;
  mothersName: string;
  voterNo: string;
  dob: string;
  address: string;
  area: string;
  pdfId: string;
}

export interface PDFRecord {
  id: string;
  filename: string;
  sourceType: "file" | "link";
  url?: string;
  status: "processing" | "success" | "error";
  votersCount: number;
  errorMessage?: string;
  createdAt: string;
}

export interface SearchAnalytic {
  id: string;
  query: string;
  searchField: string;
  resultsCount: number;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
}

export interface DatabaseState {
  voters: Voter[];
  pdfs: PDFRecord[];
  analytics: SearchAnalytic[];
  users: AdminUser[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Helper for secure hashing using native Node crypto
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

let dbInMemory: DatabaseState = {
  voters: [],
  pdfs: [],
  analytics: [],
  users: []
};

let dbLoaded = false;

// Ensure DB directory and file exist
export async function initDb(): Promise<void> {
  if (dbLoaded) return;
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DB_FILE, "utf-8");
      dbInMemory = JSON.parse(content);
      dbLoaded = true;
    } catch (e) {
      // File doesn't exist or is corrupted, create new
      const defaultAdmin: AdminUser = {
        id: crypto.randomUUID(),
        username: "admin",
        passwordHash: hashPassword("admin1234") // default secure admin password
      };
      
      dbInMemory = {
        voters: [],
        pdfs: [],
        analytics: [],
        users: [defaultAdmin]
      };
      await saveDb();
      dbLoaded = true;
      console.log("Database initialized with default admin.");
    }
  } catch (err) {
    console.error("Failed to initialize database:", err);
    throw err;
  }
}

// Queue to serialize saveDb calls to prevent concurrent writes and file corruption
let writeQueue: Promise<void> = Promise.resolve();

// Persist current state to disk
async function saveDb(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        await fs.mkdir(DB_DIR, { recursive: true });
        await fs.writeFile(DB_FILE, JSON.stringify(dbInMemory, null, 2), "utf-8");
        resolve();
      } catch (err) {
        console.error("Failed to save database to disk:", err);
        reject(err);
      }
    });
  });
}

// ---------------------- ADMIN AUTH ----------------------

export async function validateAdmin(username: string, passwordString: string): Promise<AdminUser | null> {
  await initDb();
  const hash = hashPassword(passwordString);
  const user = dbInMemory.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash);
  return user || null;
}

export async function updateAdminPassword(username: string, oldPass: string, newPass: string): Promise<boolean> {
  await initDb();
  const user = await validateAdmin(username, oldPass);
  if (!user) return false;
  user.passwordHash = hashPassword(newPass);
  await saveDb();
  return true;
}

// ---------------------- VOTER QUERY & WRITE ----------------------

export async function searchVoters(
  query: string,
  field: string,
  area?: string
): Promise<Voter[]> {
  await initDb();
  const cleanQuery = query.trim().toLowerCase();
  
  let filtered = dbInMemory.voters;
  
  if (area && area !== "All Areas") {
    filtered = filtered.filter(v => v.area.toLowerCase() === area.toLowerCase());
  }

  if (cleanQuery) {
    filtered = filtered.filter(v => {
      switch (field) {
        case "name":
          return v.name.toLowerCase().includes(cleanQuery);
        case "fathersName":
          return v.fathersName.toLowerCase().includes(cleanQuery);
        case "mothersName":
          return v.mothersName.toLowerCase().includes(cleanQuery);
        case "voterNo":
          return v.voterNo.toLowerCase().includes(cleanQuery);
        case "dob":
          return v.dob.includes(cleanQuery);
        case "address":
          return v.address.toLowerCase().includes(cleanQuery);
        default:
          // Search across all fields if unspecified
          return (
            v.name.toLowerCase().includes(cleanQuery) ||
            v.fathersName.toLowerCase().includes(cleanQuery) ||
            v.mothersName.toLowerCase().includes(cleanQuery) ||
            v.voterNo.toLowerCase().includes(cleanQuery) ||
            v.dob.includes(cleanQuery) ||
            v.address.toLowerCase().includes(cleanQuery)
          );
      }
    });
  }
  
  return filtered;
}

export async function getUniqueAreas(): Promise<string[]> {
  await initDb();
  const areas = new Set<string>();
  dbInMemory.voters.forEach(v => {
    if (v.area) areas.add(v.area);
  });
  return Array.from(areas).sort();
}

export async function addVoters(votersList: Omit<Voter, "id">[]): Promise<number> {
  await initDb();
  const votersWithIds = votersList.map(v => ({
    ...v,
    id: crypto.randomUUID()
  }));
  dbInMemory.voters.push(...votersWithIds);
  await saveDb();
  return votersWithIds.length;
}

export async function editVoter(id: string, updated: Partial<Omit<Voter, "id" | "pdfId">>): Promise<boolean> {
  await initDb();
  const index = dbInMemory.voters.findIndex(v => v.id === id);
  if (index === -1) return false;
  
  dbInMemory.voters[index] = {
    ...dbInMemory.voters[index],
    ...updated
  };
  await saveDb();
  return true;
}

export async function deleteVoter(id: string): Promise<boolean> {
  await initDb();
  const initialLen = dbInMemory.voters.length;
  dbInMemory.voters = dbInMemory.voters.filter(v => v.id !== id);
  if (dbInMemory.voters.length === initialLen) return false;
  await saveDb();
  return true;
}

// ---------------------- PDF METADATA ----------------------

export async function getPDFs(): Promise<PDFRecord[]> {
  await initDb();
  return dbInMemory.pdfs;
}

export async function addPDFRecord(filename: string, sourceType: "file" | "link", url?: string): Promise<PDFRecord> {
  await initDb();
  const record: PDFRecord = {
    id: crypto.randomUUID(),
    filename,
    sourceType,
    url,
    status: "processing",
    votersCount: 0,
    createdAt: new Date().toISOString()
  };
  dbInMemory.pdfs.push(record);
  await saveDb();
  return record;
}

export async function updatePDFStatus(
  id: string,
  status: "processing" | "success" | "error",
  votersCount: number,
  errorMessage?: string
): Promise<boolean> {
  await initDb();
  const pdf = dbInMemory.pdfs.find(p => p.id === id);
  if (!pdf) return false;
  pdf.status = status;
  pdf.votersCount = votersCount;
  if (errorMessage !== undefined) pdf.errorMessage = errorMessage;
  await saveDb();
  return true;
}

export async function deletePDF(id: string): Promise<boolean> {
  await initDb();
  const initialLen = dbInMemory.pdfs.length;
  // Remove associated voters
  dbInMemory.voters = dbInMemory.voters.filter(v => v.pdfId !== id);
  // Remove PDF record
  dbInMemory.pdfs = dbInMemory.pdfs.filter(p => p.id !== id);
  
  if (dbInMemory.pdfs.length === initialLen) return false;
  await saveDb();
  return true;
}

// ---------------------- SEARCH ANALYTICS ----------------------

export async function logSearch(query: string, searchField: string, resultsCount: number): Promise<void> {
  await initDb();
  const analytic: SearchAnalytic = {
    id: crypto.randomUUID(),
    query,
    searchField,
    resultsCount,
    timestamp: new Date().toISOString()
  };
  dbInMemory.analytics.push(analytic);
  
  // Cap analytics size to 2000 records to keep it clean
  if (dbInMemory.analytics.length > 2000) {
    dbInMemory.analytics.shift();
  }
  
  await saveDb();
}

export async function getAnalyticsStats() {
  await initDb();
  const totalSearches = dbInMemory.analytics.length;
  
  // Count by field
  const fieldCounts: Record<string, number> = {};
  dbInMemory.analytics.forEach(a => {
    fieldCounts[a.searchField] = (fieldCounts[a.searchField] || 0) + 1;
  });
  
  // Top queries
  const queryCounts: Record<string, number> = {};
  dbInMemory.analytics.forEach(a => {
    if (a.query.trim()) {
      queryCounts[a.query.trim()] = (queryCounts[a.query.trim()] || 0) + 1;
    }
  });
  
  const topQueries = Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSearches,
    fieldCounts,
    topQueries,
    totalVoters: dbInMemory.voters.length,
    totalPDFs: dbInMemory.pdfs.length
  };
}

// ---------------------- DATABASE BACKUP & RESTORE ----------------------

export async function getBackupData(): Promise<string> {
  await initDb();
  return JSON.stringify(dbInMemory, null, 2);
}

export async function restoreDatabase(jsonContent: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonContent) as DatabaseState;
    if (
      Array.isArray(parsed.voters) &&
      Array.isArray(parsed.pdfs) &&
      Array.isArray(parsed.analytics) &&
      Array.isArray(parsed.users)
    ) {
      dbInMemory = parsed;
      await saveDb();
      return true;
    }
  } catch (err) {
    console.error("Restore validation failed:", err);
  }
  return false;
}
