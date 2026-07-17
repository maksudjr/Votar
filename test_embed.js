import fs from 'fs';

async function test() {
  try {
    const url = 'https://drive.google.com/embeddedfolderview?id=1OifpYJEb3dLJrHqUnyxC4upVWdeBs5hZ';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    fs.writeFileSync('embed.html', html);
    console.log('Embed HTML saved. Length:', html.length);
    
    // Find .pdf (case insensitive)
    let idx = -1;
    let count = 0;
    const lowerHtml = html.toLowerCase();
    while ((idx = lowerHtml.indexOf('.pdf', idx + 1)) !== -1 && count < 10) {
      console.log(`\nOccurrence ${count + 1} at index ${idx}:`);
      console.log(html.substring(idx - 150, idx + 150));
      count++;
    }
    
    // Find any links with "file/d/"
    let dIdx = -1;
    let dCount = 0;
    while ((dIdx = html.indexOf('file/d/', dIdx + 1)) !== -1 && dCount < 10) {
      console.log(`\nLink/d Occurrence ${dCount + 1} at index ${dIdx}:`);
      console.log(html.substring(dIdx - 50, dIdx + 100));
      dCount++;
    }
  } catch (err) {
    console.error(err);
  }
}

test();
