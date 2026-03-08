const Cart = (() => {
  const API_URL = 'http://localhost:3000';

  // ── Helpers de sesión ─────────────────────────────────────
  function getToken() { return localStorage.getItem('tienda_token'); }
  function isLoggedIn() { return !!getToken(); }

  // ── Storage local ─────────────────────────────────────────
  function getItems() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  }
  function saveItems(items) {
    localStorage.setItem('cart', JSON.stringify(items));
  }

  // ── Sincronización con servidor ───────────────────────────
  let syncTimer = null;
  function scheduleSync() {
    if (!isLoggedIn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const items = getItems().map(i => ({ producto_id: i.id, cantidad: i.qty }));
      try {
        await fetch(`${API_URL}/api/cart/sync`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify({ items })
        });
      } catch { /* silencioso */ }
    }, 600);
  }

  // Cargar carrito del servidor y mergear con localStorage
  async function loadAndMerge() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) return;
      const serverItems = await res.json();

      const local = getItems();
      const merged = [...serverItems];

      // Agregar items locales que no estén en servidor
      local.forEach(localItem => {
        const existing = merged.find(i => i.id === localItem.id);
        if (existing) {
          existing.qty = Math.max(existing.qty, localItem.qty);
        } else {
          merged.push(localItem);
        }
      });

      saveItems(merged);
      updateBadge();
      scheduleSync(); // sincronizar el estado mergeado
    } catch { /* silencioso */ }
  }

  // ── Badge ─────────────────────────────────────────────────
  function updateBadge() {
    const count = getItems().reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll('.nav__cart-badge').forEach(badge => {
      badge.textContent = count > 0 ? count : '';
      badge.classList.toggle('nav__cart-badge--visible', count > 0);
    });
  }

  // ── Drawer HTML ───────────────────────────────────────────
  function injectDrawer() {
    if (document.getElementById('cartDrawer')) return;
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-drawer__overlay"></div>
      <div class="cart-drawer__panel">
        <div class="cart-drawer__header">
          <h3 class="cart-drawer__title">Tu carro</h3>
          <button class="cart-drawer__close" type="button" aria-label="Cerrar">&#x2715;</button>
        </div>
        <div class="cart-drawer__body"></div>
        <div class="cart-drawer__footer">
          <div class="cart-drawer__total">
            <span>Total</span>
            <span class="cart-drawer__total-price"></span>
          </div>
          <a href="cart.html" class="cart-drawer__view-full">Ver carro completo</a>
          <button class="cart-drawer__checkout" type="button">Ir a pagar</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    drawer.querySelector('.cart-drawer__overlay').addEventListener('click', close);
    drawer.querySelector('.cart-drawer__close').addEventListener('click', close);
    drawer.querySelector('.cart-drawer__checkout').addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  // ── Render drawer ─────────────────────────────────────────
  function formatPrice(price) {
    return '$' + price.toLocaleString('es-CL');
  }

  function render() {
    const body    = document.querySelector('.cart-drawer__body');
    const totalEl = document.querySelector('.cart-drawer__total-price');
    if (!body) return;

    const items = getItems();

    if (items.length === 0) {
      body.innerHTML = '<p class="cart-drawer__empty">Tu carro está vacío.</p>';
      if (totalEl) totalEl.textContent = formatPrice(0);
      return;
    }

    body.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__img" style="background-image: url('${item.image}')"></div>
        <div class="cart-item__info">
          <p class="cart-item__name">${item.name}</p>
          <p class="cart-item__price">${formatPrice(item.price)}</p>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button class="cart-item__qty-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-id="${item.id}" aria-label="Eliminar">&#x2715;</button>
      </div>
    `).join('');

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (totalEl) totalEl.textContent = formatPrice(total);

    body.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', () => { remove(Number(btn.dataset.id)); render(); });
    });
    body.querySelectorAll('.cart-item__qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQty(Number(btn.dataset.id), btn.dataset.action === 'inc' ? 1 : -1);
        render();
      });
    });
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('cart-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('cart-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  // ── Public API ────────────────────────────────────────────
  function add(product) {
    const items = getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      items.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
    }
    saveItems(items);
    updateBadge();
    render();
    scheduleSync();
    showToast(`${product.name} agregado al carro`);
  }

  function remove(id) {
    saveItems(getItems().filter(i => i.id !== id));
    updateBadge();
    scheduleSync();
  }

  function updateQty(id, delta) {
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveItems(items);
    updateBadge();
    scheduleSync();
  }

  function clearAll() {
    saveItems([]);
    updateBadge();
    if (isLoggedIn()) {
      fetch(`${API_URL}/api/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      }).catch(() => {});
    }
  }

  function open() {
    render();
    document.getElementById('cartDrawer')?.classList.add('cart-drawer--open');
    document.body.classList.add('cart-open');
  }

  function close() {
    document.getElementById('cartDrawer')?.classList.remove('cart-drawer--open');
    document.body.classList.remove('cart-open');
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    injectDrawer();
    await loadAndMerge(); // merge con servidor si está logueado
    updateBadge();

    document.querySelectorAll('.nav__cart').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { add, remove, updateQty, clearAll, open, close, getItems, formatPrice };
})();
