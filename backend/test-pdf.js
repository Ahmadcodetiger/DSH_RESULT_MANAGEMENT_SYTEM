const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent('<h1>Test PDF</h1>', { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  fs.writeFileSync('test.pdf', pdfBuffer);
  await browser.close();
  console.log('PDF saved, size:', pdfBuffer.length);
})();
