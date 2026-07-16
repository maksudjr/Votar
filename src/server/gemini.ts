import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs/promises";
import { Voter } from "./db";

// Initialize Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface ExtractedVoter {
  name: string;
  fathersName: string;
  mothersName: string;
  voterNo: string;
  dob: string;
  address: string;
  area: string;
}

/**
 * Extracts voter records from a PDF file using Gemini 3.5 Flash
 * @param fileBuffer The PDF file buffer
 * @returns Array of extracted voter details
 */
export async function extractVotersFromPDF(fileBuffer: Buffer, originalName: string): Promise<ExtractedVoter[]> {
  try {
    // Convert PDF buffer to Base64
    const base64PDF = fileBuffer.toString("base64");

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64PDF,
      },
    };

    const textPart = {
      text: `You are a high-precision Bangladesh Voter List parsing system.
Examine the attached PDF document which is a voter list (it may contain tables or text blocks in Bengali Unicode / Bangla language).

Your task is to identify and extract ALL voter records.
For each voter record, extract:
1. "name": The voter's name in Bengali Unicode (e.g., "মোঃ রফিকুল ইসলাম").
2. "fathersName": Father's name in Bengali Unicode.
3. "mothersName": Mother's name in Bengali Unicode.
4. "voterNo": Voter ID number, National ID card number, or serial number.
5. "dob": Date of birth. Format it strictly as YYYY-MM-DD if recognizable, or preserve the format found in the PDF.
6. "address": The voter's address, village, house number, or road info.
7. "area": The general area name, election area name, ward, or district of this list. Ensure to find this from the list headers, cover page, or footer. If not explicitly found, use the file context or default to a clean name like the filename: "${originalName.replace(/\.[^/.]+$/, "")}".

Provide the extracted records as a valid JSON array matching the schema. You must extract ALL voter records present in the document. Do not truncate, summarize, or skip records.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [pdfPart, textPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of all parsed voter records from the document.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full name in Bengali Unicode" },
              fathersName: { type: Type.STRING, description: "Father's name in Bengali Unicode" },
              mothersName: { type: Type.STRING, description: "Mother's name in Bengali Unicode" },
              voterNo: { type: Type.STRING, description: "Voter list serial, National ID, or voter number" },
              dob: { type: Type.STRING, description: "Date of Birth (YYYY-MM-DD or custom)" },
              address: { type: Type.STRING, description: "Voter address details" },
              area: { type: Type.STRING, description: "The election area / ward / village of the voter" },
            },
            required: ["name", "fathersName", "mothersName", "voterNo", "address", "area"],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No text response received from Gemini.");
    }

    const parsedData = JSON.parse(responseText.trim()) as ExtractedVoter[];
    return parsedData;
  } catch (err: any) {
    console.error("Gemini PDF extraction error:", err);
    throw new Error(`Failed to extract data: ${err.message || err}`);
  }
}
