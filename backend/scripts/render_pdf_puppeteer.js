const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function renderPdfPages() {
  const pdfPath = 'C:/Users/HP/.gemini/antigravity-ide/brain/9c1206a0-beb3-4e10-96bd-77d4552bdf77/.user_uploaded/media_1787347218172.pdf';
  const outDir = 'C:/Users/HP/.gemini/antigravity-ide/brain/9c1206a0-beb3-4e10-96bd-77d4552bdf77/scratch';
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  
  // Convert PDF to HTML using pdfjs or render via data url / canvas
  const pdfData = fs.readFileSync(pdfPath).toString('base64');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
      <style>
        body { margin: 0; background: #333; }
        .page-container { margin: 10px auto; display: block; text-align: center; }
        canvas { box-shadow: 0 4px 10px rgba(0,0,0,0.5); background: white; }
      </style>
    </head>
    <body>
      <div id="container"></div>
      <script>
        const pdfData = atob("${pdfData}");
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        async function load() {
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;
          window.totalPdfPages = pdf.numPages;
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const div = document.createElement('div');
            div.id = 'page-' + pageNum;
            div.className = 'page-container';
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            div.appendChild(canvas);
            document.getElementById('container').appendChild(div);
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
          }
          window.pdfRenderFinished = true;
        }
        load();
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForFunction('window.pdfRenderFinished === true', { timeout: 60000 });
  
  const totalPages = await page.evaluate(() => window.totalPdfPages);
  console.log('Total PDF Pages rendered:', totalPages);

  for (let i = 1; i <= totalPages; i++) {
    const element = await page.$(`#page-${i} canvas`);
    if (element) {
      const outPath = path.join(outDir, `guia_page_${i}.png`);
      await element.screenshot({ path: outPath });
      console.log(`Saved guia_page_${i}.png`);
    }
  }

  await browser.close();
  console.log('SUCCESS! ALL PAGES SAVED AS HIGH-RES PNGs');
}

renderPdfPages().catch(console.error);
