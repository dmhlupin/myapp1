const fs = require('fs');
const path = require('path');

const pdfLinks = [
  { name: 'Инструкция по установке', file: 'install.pdf' },
  { name: 'Инструкция по настройке', file: 'config.pdf' },
  { name: 'Инструкция по использованию', file: 'usage.pdf' },
  { name: 'Инструкция по устранению неисправностей', file: 'troubleshoot.pdf' }
];

function renderPdfList(req, res) {
  const htmlPath = path.join(__dirname, '..', 'views', 'pdf.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  let pdfItemsHtml = '';
  pdfLinks.forEach(link => {
    pdfItemsHtml += `
      <div class="pdf-item">
        <div class="info">
          <span class="icon">📄</span>
          <div>
            <div class="name">${link.name}</div>
            <div class="filename">${link.file}</div>
          </div>
        </div>
        <a href="/pdf/${link.file}" target="_blank" class="download-link">
          📥 Открыть
        </a>
      </div>
    `;
  });
  
  const startMarker = '{{#each pdfLinks}}';
  const endMarker = '{{/each}}';
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker) + endMarker.length;
  
  if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    html = before + pdfItemsHtml + after;
  }
  
  res.send(html);
}

function renderPdfFile(req, res) {
  const filename = req.params.filename;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF: ${filename}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          padding: 20px;
        }
        .container {
          background: white;
          padding: 60px 50px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 600px;
          width: 100%;
          text-align: center;
        }
        h1 { color: #333; font-size: 28px; margin-bottom: 15px; }
        .icon-big { font-size: 64px; display: block; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          background: #f093fb;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.2s;
          border: none;
          cursor: pointer;
          font-size: 16px;
          margin: 5px;
        }
        .btn:hover { background: #e07ce6; }
        .btn.secondary { background: #667eea; }
        .btn.secondary:hover { background: #5a67d8; }
        .code {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 6px;
          font-family: monospace;
          color: #333;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="icon-big">📄</span>
        <h1>${filename}</h1>
        <p>Это демонстрационная страница PDF файла</p>
        <div class="code">📁 ${filename}</div>
        <p style="font-size: 14px; color: #999;">
          Для настоящей генерации PDF используйте библиотеку <strong>pdfkit</strong>
        </p>
        <div>
          <button onclick="window.print()" class="btn">🖨️ Сохранить как PDF</button>
          <a href="/pdf" class="btn secondary">← Назад к списку</a>
        </div>
      </div>
    </body>
    </html>
  `);
}

module.exports = {
  renderPdfList,
  renderPdfFile
};