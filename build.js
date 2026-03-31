/**
 * Build script — Shey Carpenter Vintage
 *
 * Reads images/for-purchase/ and images/for-rental/ subfolders.
 * Each subfolder may contain a details.txt with:
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

function readDetails(folderPath) {
  const filePath = path.join(folderPath, 'details.txt');
  if (!fs.existsSync(filePath)) return { name: '', price: '—', description: '' };

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const result = { name: '', price: '—', description: '' };

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

function getImages(folderPath, webPath) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];
  const files = fs.readdirSync(folderPath)
    .filter(f => exts.includes(path.extname(f)) && f !== 'details.txt');

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
  const first   = images[0] || '';
  const imgJson = JSON.stringify(images).replace(/'/g, '&#39;');
  const name    = details.name || folderName;

  return `
        <div class="product-card fade-up" data-images='${imgJson}' data-availability="available">
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
    .filter(f => fs.statSync(path.join(purchaseRoot, f)).isDirectory())
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
    .filter(f => fs.statSync(path.join(rentalRoot, f)).isDirectory())
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
  'services.html', 'checkout.html',
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
