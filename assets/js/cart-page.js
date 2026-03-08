document.addEventListener('DOMContentLoaded', () => {
  // Esperar a que cart.js termine su init (loadAndMerge es async)
  // cart.js dispara DOMContentLoaded también, así que usamos un pequeño defer
  setTimeout(renderPage, 300);

  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (Cart.getItems().length === 0) return;
    Cart.clearAll();
    renderPage();
  });

  function renderPage() {
    const items     = Cart.getItems();
    const emptyEl   = document.getElementById('cartEmpty');
    const layoutEl  = document.getElementById('cartLayout');
    const itemsEl   = document.getElementById('cartPageItems');
    const subtotalEl = document.getElementById('pageSubtotal');
    const totalEl   = document.getElementById('pageTotal');

    if (items.length === 0) {
      emptyEl.style.display  = 'flex';
      layoutEl.style.display = 'none';
      return;
    }

    emptyEl.style.display  = 'none';
    layoutEl.style.display = 'grid';

    let subtotal = 0;
    itemsEl.innerHTML = items.map(item => {
      const lineTotal = item.price * item.qty;
      subtotal += lineTotal;
      return `
        <div class="cart-page__item" data-id="${item.id}">
          <div class="cart-page__item-product">
            <div class="cart-page__item-img" style="background-image: url('${item.image}')"></div>
            <div class="cart-page__item-meta">
              <a href="product.html?id=${item.id}" class="cart-page__item-name">${item.name}</a>
            </div>
          </div>
          <p class="cart-page__item-price">${Cart.formatPrice(item.price)}</p>
          <div class="cart-page__item-qty">
            <button class="cart-page__qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span class="cart-page__qty-value">${item.qty}</span>
            <button class="cart-page__qty-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
          <p class="cart-page__item-subtotal">${Cart.formatPrice(lineTotal)}</p>
          <button class="cart-page__item-remove" data-id="${item.id}" aria-label="Eliminar">&#x2715;</button>
        </div>
      `;
    }).join('');

    subtotalEl.textContent = Cart.formatPrice(subtotal);
    totalEl.textContent    = Cart.formatPrice(subtotal);

    // Listeners
    itemsEl.querySelectorAll('.cart-page__qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.updateQty(Number(btn.dataset.id), btn.dataset.action === 'inc' ? 1 : -1);
        renderPage();
      });
    });

    itemsEl.querySelectorAll('.cart-page__item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.remove(Number(btn.dataset.id));
        renderPage();
      });
    });
  }
});
