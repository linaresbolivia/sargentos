const fs = require('fs');
const { PDFDocument, PDFRawStream } = require('pdf-lib');

async function extractImages() {
  const bytes = fs.readFileSync('C:\\Users\\HP\\Desktop\\Nueva carpeta\\INSTRUCTIVO JOFHR 022-2026_0001.pdf');
  const doc = await PDFDocument.load(bytes);
  const outDir = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\bab0d79e-781a-48e4-bb82-4027c3e92e10\\instructivo_pages';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  let imgIdx = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      const dict = obj.dict;
      const subtype = dict.get(doc.context.obj('Subtype'));
      if (subtype && subtype.toString() === '/Image') {
        imgIdx++;
        const width = dict.get(doc.context.obj('Width'))?.numberValue || dict.get(doc.context.obj('Width'));
        const height = dict.get(doc.context.obj('Height'))?.numberValue || dict.get(doc.context.obj('Height'));
        const targetPath = `${outDir}\\page_${imgIdx}.jpg`;
        fs.writeFileSync(targetPath, obj.contents);
        console.log(`Saved ${targetPath} (${width}x${height}, ${obj.contents.length} bytes)`);
      }
    }
  }
}

extractImages().catch(console.error);
