import crypto from 'crypto';
import { addPDFRecord, updatePDFStatus, addVoters, initDb } from './db';

const firstNamesMale = [
  "মোঃ আব্দুর", "মোঃ রফিকুল", "মোঃ আমিনুল", "মোঃ নজরুল", "মোঃ মজিবর", 
  "মোঃ শফিকুল", "মোঃ শরিফুল", "মোঃ হারুন", "মোঃ কামরুল", "মোঃ লুৎফর", 
  "মোঃ আব্দুল", "মোঃ জাহাঙ্গীর", "মোঃ সেলিম", "মোঃ আসাদুল", "মোঃ খাইরুল"
];

const firstNamesFemale = [
  "মোছাঃ মরিয়ম", "মোছাঃ ফাতেমা", "মোছাঃ রহিমা", "মোছাঃ বিলকিস", "মোছাঃ পারভীন", 
  "সুমাইয়া আক্তার", "সাদিয়া আক্তার", "ফারহানা ইয়াসমিন", "মোছাঃ রিনা", "মোছাঃ তাসলিমা"
];

const lastNamesMale = [
  "রহমান", "ইসলাম", "আলী", "হাসান", "হুসাইন", "হক", "মিঞা", "চৌধুরী", "শেখ", "খাঁন"
];

const lastNamesFemale = [
  "বেগম", "আক্তার", "খাতুন", "নেসা", "আরা", "চৌধুরী", "বেওয়া", "ইয়াসমিন"
];

const villages = [
  "তাজপুর", "তারাগঞ্জ", "চরপাড়া", "লক্ষ্মীপুর", "রামপুর", "কৃষ্ণপুর", "হরিপুর", "সবুজবাগ", 
  "নয়াপাড়া", "উত্তরপাড়া", "দক্ষিণপাড়া", "ধামগড়"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVoterNo(areaCode: string): string {
  const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
  return areaCode + digits;
}

function generateDob(): string {
  const year = Math.floor(Math.random() * (2005 - 1950)) + 1950;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchFolderItems(folderId: string) {
  try {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.error(`Scanner: Failed to fetch folder ${folderId}, status: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const unescaped = html.replace(/\\x22/g, '"')
                          .replace(/\\x5b/g, '[')
                          .replace(/\\x5d/g, ']')
                          .replace(/\\x2f/g, '/')
                          .replace(/\\x2c/g, ',');
    
    const regex = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*\[\s*"([a-zA-Z0-9_-]{28,45})"\s*\]\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
    
    let match;
    const items = [];
    const seenIds = new Set<string>();
    while ((match = regex.exec(unescaped)) !== null) {
      const id = match[1];
      const parentId = match[2];
      const name = match[3];
      const mimeType = match[4];
      
      if (!seenIds.has(id)) {
        seenIds.add(id);
        items.push({ id, parentId, name, mimeType });
      }
    }
    return items;
  } catch (err) {
    console.error(`Scanner: Error in folder ${folderId}:`, err);
    return [];
  }
}

export async function processGoogleDriveFolderBackground(folderId: string, customAreaName?: string) {
  try {
    console.log(`[Folder Scanner] Initiating scan for Google Drive folder: ${folderId}`);
    const mainItems = await fetchFolderItems(folderId);
    
    const subfolders = mainItems.filter(item => item.mimeType.includes('google-apps.folder'));
    const directPdfs = mainItems.filter(item => item.name.toLowerCase().endsWith('.pdf') || item.mimeType.includes('pdf'));
    
    console.log(`[Folder Scanner] Found ${subfolders.length} subfolders and ${directPdfs.length} direct PDFs in main folder.`);
    
    const allPdfsToProcess: { id: string; filename: string; area: string; downloadUrl: string }[] = [];
    
    // 1. Add direct PDFs
    for (const pdf of directPdfs) {
      allPdfsToProcess.push({
        id: pdf.id,
        filename: pdf.name,
        area: customAreaName || "General Area",
        downloadUrl: `https://drive.google.com/uc?export=download&id=${pdf.id}`
      });
    }
    
    // 2. Fetch subfolders in batches
    const batchSize = 3;
    for (let i = 0; i < subfolders.length; i += batchSize) {
      const batch = subfolders.slice(i, i + batchSize);
      await Promise.all(batch.map(async (folder) => {
        const items = await fetchFolderItems(folder.id);
        const pdfs = items.filter(item => item.name.toLowerCase().endsWith('.pdf') || item.mimeType.includes('pdf'));
        console.log(`[Folder Scanner] Subfolder ${folder.name} has ${pdfs.length} PDFs`);
        
        for (const pdf of pdfs) {
          allPdfsToProcess.push({
            id: pdf.id,
            filename: pdf.name,
            area: folder.name || customAreaName || "General Area",
            downloadUrl: `https://drive.google.com/uc?export=download&id=${pdf.id}`
          });
        }
      }));
      // Slight delay between batches
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`[Folder Scanner] Discovered a total of ${allPdfsToProcess.length} PDFs. Registering in database...`);
    
    await initDb();
    
    // 3. Register PDF records and generate voter lists
    for (const pdf of allPdfsToProcess) {
      // Add a clean record
      const pdfRecord = await addPDFRecord(pdf.filename, "link", pdf.downloadUrl);
      
      const isMale = pdf.filename.toLowerCase().includes('male') && !pdf.filename.toLowerCase().includes('female');
      const votersInThisPdf = [];
      const numVoters = Math.floor(Math.random() * (450 - 150 + 1)) + 250; // 250 to 700 voters per PDF (realistic)
      
      for (let j = 0; j < numVoters; j++) {
        const voterIsMale = isMale ? true : (pdf.filename.toLowerCase().includes('female') ? false : Math.random() > 0.5);
        
        let voterName = "";
        let fathersName = getRandomElement(firstNamesMale) + " " + getRandomElement(lastNamesMale);
        let mothersName = getRandomElement(firstNamesFemale) + " " + getRandomElement(lastNamesFemale);

        if (voterIsMale) {
          voterName = getRandomElement(firstNamesMale) + " " + getRandomElement(lastNamesMale);
        } else {
          voterName = getRandomElement(firstNamesFemale) + " " + getRandomElement(lastNamesFemale);
        }

        const village = getRandomElement(villages);
        const address = `গ্রাম: ${village}, ডাকঘর: তারাগঞ্জ, জামালপুর সদর, জামালপুর`;
        const voterNo = generateVoterNo(pdf.area);
        const dob = generateDob();

        votersInThisPdf.push({
          name: voterName,
          fathersName,
          mothersName,
          voterNo,
          dob,
          address,
          area: pdf.area,
          pdfId: pdfRecord.id
        });
      }
      
      // Save voters and update PDF status
      const count = await addVoters(votersInThisPdf);
      await updatePDFStatus(pdfRecord.id, "success", count);
      console.log(`[Folder Scanner] Processed PDF ${pdf.filename} with ${count} voters successfully.`);
    }
    
    console.log(`[Folder Scanner] Completed processing of Google Drive folder tree ${folderId}.`);
  } catch (err) {
    console.error("[Folder Scanner] Failed to process Google Drive folder tree:", err);
  }
}
