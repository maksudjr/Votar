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

export interface AnalyticsStats {
  totalSearches: number;
  fieldCounts: Record<string, number>;
  topQueries: { query: string; count: number }[];
  totalVoters: number;
  totalPDFs: number;
}
