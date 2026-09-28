const fs = require('fs');
const pdf = require('pdf-parse');

const files = [
  'C:\\Users\\HP\\Downloads\\INSTRUCTIVO INTERNO CHLS_GG_11_2025.pdf',
  'C:\\Users\\HP\\Desktop\\Nueva carpeta\\MODELO INSTRUCTIVOS.pdf',
  'C:\\Users\\HP\\Desktop\\Nueva carpeta\\INSTRUCTIVO JOFHR 022-2026_0001.pdf',
  'C:\\Users\\HP\\Downloads\\INSTRUCTIVO FILES DE PERSONAL.pdf',
];

async function run() {
  for (const f of files) {
    if (fs.existsSync(f)) {
      console.log('==================================================');
      console.log('FILE:', f);
      console.log('==================================================');
      try {
        const dataBuffer = fs.readFileSync(f);
        const data = await pdf(dataBuffer);
        console.log(data.text.substring(0, 3000)); // Print first 3000 chars
      } catch (err) {
        console.error('Error reading', f, err.message);
      }
    } else {
      console.log('NOT FOUND:', f);
    }
  }
}

run();
