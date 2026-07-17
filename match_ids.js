import fs from 'fs';

function find() {
  const html = fs.readFileSync('drive.html', 'utf-8');
  const ids = [
    '1ajRbn5CndH56yxYf1J_AKWI5nmWE1DOT',
    '1DHr_PGQLW3dJpCPGKWurGsnvM_z8eX9r',
    '1mNcIyiUv0rnY7BkIeGT6bREzhnPIqZf9',
    '1VUu0Sv7NlNhgcZf-R8UmgnjafKER3zSL',
    '1T5WsIaxsMJR_jC57xz3VKfWftrkMAvja',
    '1SaOQr_SXd12ZR1QhQHxZ7-NqRSTt8Uob',
    '1QdG0N3A2sg-Pisq2GP-h6RXOrrpKZWha',
    '1n27m1JCVZEMY_zmMV0_aJcwvLQidxa7z',
    '1F1c1hs85hJnLnKtFcDqVLzvVVC_FsrhC'
  ];

  for (const id of ids) {
    let pos = -1;
    while ((pos = html.indexOf(id, pos + 1)) !== -1) {
      console.log(`\nFound ID ${id} at index ${pos}`);
      // Print 200 chars around it
      console.log(html.substring(pos - 150, pos + 150));
    }
  }
}

find();
