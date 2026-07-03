const fs = require('fs');
const path = require('path');

function renderIndex(req, res) {
  const htmlPath = path.join(__dirname, '..', 'views', 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Ошибка загрузки страницы');
      return;
    }
    res.send(html);
  });
}

module.exports = renderIndex;