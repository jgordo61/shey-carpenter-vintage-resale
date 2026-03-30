/* ============================================================
   SHEY CARPENTER VINTAGE — main.js
   Custom cursor · Nav toggle · Cart · Filters · Accordion
   ============================================================ */

// ── Custom Cursor ────────────────────────────────────────────
const dot  = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');

if (dot && ring) {
  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  })();

  document.querySelectorAll('a, button, .product-card, .category-card, .filter-option, .product-thumb').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovered'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovered'));
  });

  document.addEventListener('mousedown', () => ring.classList.add('clicked'));
  document.addEventListener('mouseup',   () => ring.classList.remove('clicked'));
}

// ── Mobile Nav ───────────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => document.body.classList.remove('nav-open'));
  });
}

// ── Active Nav Link ──────────────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// ── Entrance Animations ──────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach((el, i) => {
  if (!el.dataset.delay) el.dataset.delay = i * 60;
  observer.observe(el);
});

// ── Cart State ───────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('scv_cart') || '[]');

function saveCart() {
  localStorage.setItem('scv_cart', JSON.stringify(cart));
}

function getTotal() {
  return cart.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);
}

function renderCart() {
  const itemsEl   = document.querySelector('.cart-items');
  const totalEl   = document.querySelector('.cart-total span:last-child');
  const countEl   = document.querySelector('.cart-count');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
      </div>`;
  } else {
    itemsEl.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${item.size} · ${item.era}</p>
          <button class="cart-item-remove" data-idx="${idx}">Remove</button>
        </div>
        <span class="cart-item-price">$${item.price}</span>
      </div>`).join('');

    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(parseInt(btn.dataset.idx), 1);
        saveCart();
        renderCart();
      });
    });
  }

  if (totalEl) totalEl.textContent = '$' + getTotal();

  if (countEl) {
    countEl.textContent = cart.length;
    countEl.classList.toggle('visible', cart.length > 0);
  }
}

// Open / close cart
// Cart checkout button → checkout page
document.querySelector('.cart-checkout')?.addEventListener('click', () => {
  if (cart.length > 0) window.location.href = 'checkout.html';
});

const cartBtn     = document.querySelector('.cart-btn');
const cartDrawer  = document.querySelector('.cart-drawer');
const cartOverlay = document.querySelector('.cart-overlay');
const cartClose   = document.querySelector('.cart-close');

function openCart()  {
  cartDrawer?.classList.add('open');
  cartOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  cartDrawer?.classList.remove('open');
  cartOverlay?.classList.remove('open');
  document.body.style.overflow = '';
}

cartBtn?.addEventListener('click', openCart);
cartClose?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);

// Add to cart (product detail page)
const addBtn = document.querySelector('.add-to-cart-btn');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    const product = {
      name:  document.querySelector('.product-info h1')?.textContent || 'Item',
      price: document.querySelector('.product-info-price')?.textContent.replace('$','').trim() || '0',
      size:  document.querySelector('[data-meta="size"]')?.textContent || 'One Size',
      era:   document.querySelector('[data-meta="era"]')?.textContent  || 'Vintage',
      img:   document.querySelector('.product-main-img img')?.src || '',
    };
    cart.push(product);
    saveCart();
    renderCart();

    addBtn.textContent = 'Added to Cart';
    addBtn.classList.add('added');
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.classList.remove('added');
    }, 2000);

    openCart();
  });
}

// Quick-add from product cards
document.querySelectorAll('.product-quick-add').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const card = btn.closest('.product-card');
    const product = {
      name:  card.querySelector('h3')?.textContent || 'Item',
      price: card.querySelector('.product-price')?.textContent.replace('$','').trim() || '0',
      size:  card.querySelector('.product-details')?.textContent.split('·')[0]?.trim() || 'One Size',
      era:   card.querySelector('.product-details')?.textContent.split('·')[1]?.trim() || 'Vintage',
      img:   card.querySelector('img')?.src || '',
    };
    cart.push(product);
    saveCart();
    renderCart();

    btn.textContent = 'Added!';
    setTimeout(() => btn.textContent = 'Quick Add', 1500);
    openCart();
  });
});

// Init cart count on load
renderCart();

// ── Product Gallery (detail page) ───────────────────────────
const thumbs    = document.querySelectorAll('.product-thumb');
const mainImg   = document.querySelector('.product-main-img img');

thumbs.forEach(thumb => {
  thumb.addEventListener('click', () => {
    thumbs.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    if (mainImg) mainImg.src = thumb.querySelector('img').src;
  });
});

// ── Product Accordion ────────────────────────────────────────
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Shop Filters ─────────────────────────────────────────────
document.querySelectorAll('.filter-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const group = opt.closest('.filter-group');
    // Allow multi-select within a group (remove active from siblings only for size / single-select groups)
    const isSingle = opt.dataset.single === 'true';
    if (isSingle) {
      group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
    }
    opt.classList.toggle('active');
    filterProducts();
  });
});

function filterProducts() {
  const activeFilters = {};
  document.querySelectorAll('.filter-group').forEach(group => {
    const key    = group.dataset.filter;
    const active = [...group.querySelectorAll('.filter-option.active')].map(o => o.dataset.value);
    if (active.length) activeFilters[key] = active;
  });

  let visible = 0;
  document.querySelectorAll('.product-card[data-category]').forEach(card => {
    let show = true;
    for (const [key, vals] of Object.entries(activeFilters)) {
      const cardVal = card.dataset[key];
      if (cardVal && !vals.includes(cardVal)) { show = false; break; }
    }
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const countEl = document.querySelector('.shop-count');
  if (countEl) countEl.textContent = visible + ' items';
}

// ── Sort ─────────────────────────────────────────────────────
const sortSelect = document.querySelector('.sort-select');
sortSelect?.addEventListener('change', () => {
  const grid  = document.querySelector('.product-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.product-card')];

  cards.sort((a, b) => {
    const pa = parseFloat(a.querySelector('.product-price')?.textContent.replace('$','') || 0);
    const pb = parseFloat(b.querySelector('.product-price')?.textContent.replace('$','') || 0);
    const na = a.querySelector('h3')?.textContent || '';
    const nb = b.querySelector('h3')?.textContent || '';

    switch (sortSelect.value) {
      case 'price-asc':  return pa - pb;
      case 'price-desc': return pb - pa;
      case 'alpha':      return na.localeCompare(nb);
      default:           return 0;
    }
  });

  cards.forEach(c => grid.appendChild(c));
});

// ── Card Image Hover Cycling (crossfade) ─────────────────────
document.querySelectorAll('.product-card').forEach(card => {
  const imgEl = card.querySelector('.product-card-img img');
  if (!imgEl) return;

  const raw = card.getAttribute('data-images');
  if (!raw) return;

  let images;
  try { images = JSON.parse(raw); } catch(e) { return; }
  if (images.length <= 1) return;

  // Preload all images
  images.forEach(src => { const i = new Image(); i.src = src; });

  // Create an overlay image that sits on top for crossfading
  const overlay = document.createElement('img');
  overlay.style.cssText = [
    'position:absolute', 'inset:0', 'width:100%', 'height:100%',
    'object-fit:cover', 'opacity:0',
    'transition:opacity 1.1s ease',
    'pointer-events:none'
  ].join(';');
  imgEl.parentElement.appendChild(overlay);

  // Base image also fades smoothly
  imgEl.style.transition = 'opacity 1.1s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1)';

  let index = 0;
  let useOverlay = false;
  let timer = null;

  function showNext() {
    index = (index + 1) % images.length;
    if (!useOverlay) {
      // Fade overlay IN over current base image
      overlay.src = images[index];
      overlay.style.opacity = '1';
    } else {
      // Swap base image underneath, then fade overlay OUT
      imgEl.src = images[index];
      overlay.style.opacity = '0';
    }
    useOverlay = !useOverlay;
  }

  card.addEventListener('mouseenter', () => {
    timer = setInterval(showNext, 1620);
  });

  card.addEventListener('mouseleave', () => {
    clearInterval(timer);
    timer = null;
    // Smoothly reset to first image
    imgEl.src = images[0];
    overlay.style.opacity = '0';
    index = 0;
    useOverlay = false;
  });
});

// ── Card → Detail Page Navigation ────────────────────────────
document.querySelectorAll('.product-card a').forEach(link => {
  link.addEventListener('click', e => {
    const card = link.closest('.product-card');
    const imagesAttr = card.getAttribute('data-images');
    if (!imagesAttr) return;

    e.preventDefault();
    const name   = card.querySelector('h3')?.textContent?.trim() || '';
    const price  = card.querySelector('.product-price, .rental-price')?.textContent?.trim() || '—';
    const status = card.dataset.availability || 'available';
    const base   = link.getAttribute('href').split('?')[0];

    const params = new URLSearchParams({ name, images: imagesAttr, price, status });
    window.location.href = base + '?' + params.toString();
  });
});

// ── Booking Form ─────────────────────────────────────────────
const bookingForm = document.querySelector('#booking-form');
if (bookingForm) {
  bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    bookingForm.style.display = 'none';
    document.querySelector('.form-success')?.classList.add('visible');
  });
}
