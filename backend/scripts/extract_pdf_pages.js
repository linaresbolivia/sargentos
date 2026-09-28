const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function extract() {
  const pdfPath = 'C:/Users/HP/.gemini/antigravity-ide/brain/9c1206a0-beb3-4e10-96bd-77d4552bdf77/.user_uploaded/media_1787347218172.pdf';
  const outDir = 'C:/Users/HP/.gemini/antigravity-ide/brain/9c1206a0-beb3-4e10-96bd-77d4552bdf77/scratch';
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  await parser.load();
  
  for (let i = 1; i <= 25; i++) {
    const s = await parser.getScreenshot({ pageIndex: i - 1 });
    if (s && s.pages && s.pages[0]) {
      const p = s.pages[0];
      const outPath = path.join(outDir, 'guia_p' + i + '.png');
      if (p.dataUrl) {
        const base64Data = p.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
        console.log('Saved guia_p' + i + '.png (' + fs.statSync(outPath).size + ' bytes)');
      } else if (Buffer.isBuffer(p.data)) {
        fs.writeFileSync(outPath, p.data);
        console.log('Saved guia_p' + i + '.png buffer');
      } else if (p.data && p.data.buffer) {
        fs.writeFileSync(outPath, Buffer.from(p.data.buffer));
        console.log('Saved guia_p' + i + '.png arraybuffer');
      }
    }
  }
}

extract().then(() => console.log('ALL 25 PAGES EXTRACTED!')).catch(console.error);
