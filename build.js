/**
 * Build script — Shey Carpenter Vintage
 *
 * Reads images/for-purchase/ and images/for-rental/ subfolders.
 * Each subfolder may contain a details.rtf (or details.txt) with:
 *   Name: ...
 *   Price: ...
 *   Description: ...
 *
 * Images are sorted numerically (1.jpg, 2.jpg, ...).
 * Generates product cards in shop.html and styling.html,
 * then copies everything to dist/.
 */

const fs   = require('fs');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────

function stripRtf(rtf) {
  return rtf
    .replace(/\{\\fonttbl[\s\S]*?\}/g, '')
    .replace(/\{\\colortbl[\s\S]*?\}/g, '')
    .replace(/\{\\\*[\s\S]*?\}/g, '')
    .replace(/\\par\b\s?/g, '\n')
    .replace(/\\line\b\s?/g, '\n')
    // backslash + newline = line break in macOS TextEdit RTF
    .replace(/\\\n/g, '\n')
    // RTF escape sequences like \'e8 → decode basic latin-1
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[a-zA-Z]+\-?\d*[ ]?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\r/g, '')
    .trim();
}

function normalizePrice(str) {
  // Handle formats: $40. / 150$ / 80$. / $1100 / $12,000 / 65$.
  str = str.trim().replace(/\.$/, '').trim(); // remove trailing period
  if (/^\$/.test(str)) return str;            // already $XX
  if (/\$$/.test(str)) return '$' + str.slice(0, -1).trim(); // XX$ → $XX
  return str;
}

function readDetails(folderPath) {
  // Accept any .rtf file in the folder, or details.txt as fallback
  let raw = null;
  const files = fs.readdirSync(folderPath);
  const rtfFile = files.find(f => f.toLowerCase().endsWith('.rtf'));
  const txtFile = files.find(f => f.toLowerCase() === 'details.txt');

  if (rtfFile) {
    raw = stripRtf(fs.readFileSync(path.join(folderPath, rtfFile), 'utf8'));
  } else if (txtFile) {
    raw = fs.readFileSync(path.join(folderPath, txtFile), 'utf8');
  }

  if (!raw) return { name: '', price: '—', description: '', rates: [] };

  // If file uses Name:/Price:/Description: labels, use those
  if (/^(name|price|description)\s*:/im.test(raw)) {
    const lines = raw.split('\n');
    const result = { name: '', price: '—', description: '', rates: [] };
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim().toLowerCase();
      const val = line.slice(colon + 1).trim();
      if (key === 'name')        result.name        = val;
      if (key === 'price')       result.price       = val;
      if (key === 'description') result.description = val;
    }
    return result;
  }

  // Otherwise parse macOS TextEdit format: price/rates on separate lines
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = { name: '', price: '—', description: '', rates: [] };

  for (const line of lines) {
    // Rental rate lines: contain $ and a duration keyword or "Final Sale"
    if (/\$/.test(line) && /(per day|for \d+\s*day|Final Sale)/i.test(line)) {
      result.rates.push(line);
      // Extract day rate for card display: "Starting at $10 per day" → "$10/day"
      if (result.price === '—' && /per day/i.test(line)) {
        const m = line.match(/\$[\d,]+/);
        if (m) result.price = m[0] + '/day';
      }
    } else if (result.price === '—' && /\$/.test(line)) {
      // Purchase price (no duration keyword)
      const match = line.match(/(\$[\d,]+\.?|[\d,]+\$)/);
      if (match) result.price = normalizePrice(match[0]);
    }
  }

  // Size line (last non-empty line before rates, if it looks like a size)
  const sizeLine = lines.find(l => /^(XXS|XS|S|M|L|XL|XXL|Size)/i.test(l));
  if (sizeLine) result.description = sizeLine;

  return result;
}

function getImages(folderPath, webPath) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];
  const files = fs.readdirSync(folderPath)
    .filter(f => exts.includes(path.extname(f)));

  // Natural / numeric sort: 1.jpg, 2.jpg, 10.jpg ...
  files.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  return files.map(f => `${webPath}/${f}`);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Card generators ────────────────────────────────────────────────────────

function shopCard(folderName, images, details) {
  const first    = images[0] || '';
  const imgJson  = JSON.stringify(images).replace(/'/g, '&#39;');
  const name     = details.name || folderName;

  return `
        <div class="product-card fade-up" data-images='${imgJson}'>
          <a href="product.html">
            <div class="product-card-img">
              <img src="${escapeHtml(first)}" alt="${escapeHtml(name)}">
              <button class="product-quick-add">Quick Add</button>
            </div>
            <div class="product-card-body">
              <h3>${escapeHtml(name)}</h3>
              <div class="product-meta">
                <span class="product-details">${escapeHtml(details.description)}</span>
                <span class="product-price">${escapeHtml(details.price)}</span>
              </div>
            </div>
          </a>
        </div>`;
}

function rentalCard(folderName, images, details) {
  const first     = images[0] || '';
  const imgJson   = JSON.stringify(images).replace(/'/g, '&#39;');
  const ratesJson = JSON.stringify(details.rates || []).replace(/'/g, '&#39;');
  const name      = details.name || folderName;

  return `
        <div class="product-card fade-up" data-images='${imgJson}' data-rates='${ratesJson}' data-availability="available">
          <a href="rental-item.html">
            <div class="product-card-img">
              <img src="${escapeHtml(first)}" alt="${escapeHtml(name)}">
            </div>
            <div class="product-card-body">
              <h3>${escapeHtml(name)}</h3>
              <div class="product-meta">
                <span class="product-details">${escapeHtml(details.description)}</span>
                <span class="rental-price">${escapeHtml(details.price)}</span>
              </div>
            </div>
          </a>
        </div>`;
}

// ── Inject into HTML ───────────────────────────────────────────────────────

function inject(html, cards, count) {
  // Replace item count
  html = html.replace(/\d+ items/, `${count} item${count !== 1 ? 's' : ''}`);

  // Replace everything between the grid div and its closing tag
  html = html.replace(
    /(<div class="product-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>)/,
    (_, open, _inner, close) => `${open}\n${cards}\n      ${close}`
  );

  return html;
}

// ── Main ──────────────────────────────────────────────────────────────────

const root = __dirname;

// Ensure dist exists
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

// --- Shop ---
const purchaseRoot = path.join(root, 'images', 'for-purchase');
let shopCards = '';
let shopCount = 0;

if (fs.existsSync(purchaseRoot)) {
  const folders = fs.readdirSync(purchaseRoot)
    .filter(f => fs.statSync(path.join(purchaseRoot, f)).isDirectory() && !f.startsWith('New Folder'))
    .sort((a, b) => a.localeCompare(b));

  for (const folder of folders) {
    const folderPath = path.join(purchaseRoot, folder);
    const webPath    = `images/for-purchase/${folder}`;
    const images     = getImages(folderPath, webPath);
    if (images.length === 0) continue;
    const details = readDetails(folderPath);
    shopCards += shopCard(folder, images, details);
    shopCount++;
  }
}

let shopHtml = fs.readFileSync(path.join(root, 'shop.html'), 'utf8');
shopHtml = inject(shopHtml, shopCards, shopCount);
fs.writeFileSync(path.join(root, 'dist', 'shop.html'), shopHtml);
console.log(`✓ shop.html — ${shopCount} items`);

// --- Rental ---
const rentalRoot = path.join(root, 'images', 'for-rental');
let rentalCards = '';
let rentalCount = 0;

if (fs.existsSync(rentalRoot)) {
  const folders = fs.readdirSync(rentalRoot)
    .filter(f => fs.statSync(path.join(rentalRoot, f)).isDirectory() && !f.startsWith('New Folder'))
    .sort((a, b) => {
      // Sort numerically if folder names are numbers
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

  for (const folder of folders) {
    const folderPath = path.join(rentalRoot, folder);
    const webPath    = `images/for-rental/${folder}`;
    const images     = getImages(folderPath, webPath);
    if (images.length === 0) continue;
    const details = readDetails(folderPath);
    rentalCards += rentalCard(folder, images, details);
    rentalCount++;
  }
}

let rentalHtml = fs.readFileSync(path.join(root, 'styling.html'), 'utf8');
rentalHtml = inject(rentalHtml, rentalCards, rentalCount);
fs.writeFileSync(path.join(root, 'dist', 'styling.html'), rentalHtml);
console.log(`✓ styling.html — ${rentalCount} items`);

// --- Copy remaining static files ---
const staticFiles = [
  'index.html', 'product.html', 'rental-item.html',
  'services.html', 'checkout.html', 'info.html',
];
for (const file of staticFiles) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(root, 'dist', file));
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(path.join(root, 'css'),    path.join(root, 'dist', 'css'));
copyDir(path.join(root, 'js'),     path.join(root, 'dist', 'js'));
copyDir(path.join(root, 'images'), path.join(root, 'dist', 'images'));

console.log('✓ Static assets copied to dist/');
