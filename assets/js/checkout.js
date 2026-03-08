document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000';

  // ── Helpers ───────────────────────────────────────────────
  function formatPrice(price) {
    return '$' + price.toLocaleString('es-CL');
  }

  function getToken() {
    return localStorage.getItem('tienda_token');
  }

  function getUser() {
    const u = localStorage.getItem('tienda_current_user');
    return u ? JSON.parse(u) : null;
  }

  function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  }

  // ── Redirigir si el carro está vacío ─────────────────────
  const cartItems = getCart();
  if (cartItems.length === 0) {
    window.location.href = 'index.html';
    return;
  }

  // ── Resumen del pedido ────────────────────────────────────
  const summaryItemsEl = document.getElementById('summaryItems');
  const summarySubtotalEl = document.getElementById('summarySubtotal');
  const summaryTotalEl = document.getElementById('summaryTotal');

  let subtotal = 0;
  summaryItemsEl.innerHTML = cartItems.map(item => {
    const lineTotal = item.price * item.qty;
    subtotal += lineTotal;
    return `
      <div class="summary-item">
        <div class="summary-item__img" style="background-image: url('${item.image}')"></div>
        <div class="summary-item__info">
          <p class="summary-item__name">${item.name}</p>
          <p class="summary-item__qty">x${item.qty}</p>
        </div>
        <p class="summary-item__price">${formatPrice(lineTotal)}</p>
      </div>
    `;
  }).join('');

  summarySubtotalEl.textContent = formatPrice(subtotal);
  summaryTotalEl.textContent = formatPrice(subtotal);

  // ── Estado de sesión ──────────────────────────────────────
  const user = getUser();
  const token = getToken();
  const isLoggedIn = !!(user && token);

  const savedAddressesSection = document.getElementById('savedAddresses');
  const guestNotice = document.getElementById('guestNotice');
  const saveAddressOption = document.getElementById('saveAddressOption');
  const addNewAddressBtn = document.getElementById('addNewAddressBtn');
  const addressForm = document.getElementById('addressForm');

  let selectedAddressId = null; // null = usar formulario

  // ── Direcciones guardadas (logueado) ──────────────────────
  if (isLoggedIn) {
    savedAddressesSection.style.display = 'block';
    saveAddressOption.style.display = 'block';

    let savedAddresses = [];

    async function loadAddresses() {
      try {
        const res = await fetch(`${API_URL}/api/user/addresses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        savedAddresses = await res.json();
        renderAddresses();
      } catch {
        renderAddresses();
      }
    }

    function renderAddresses() {
      const list = document.getElementById('addressList');

      if (savedAddresses.length === 0) {
        list.innerHTML = '<p class="saved-addresses__empty">No tienes direcciones guardadas aún.</p>';
        showForm();
        return;
      }

      list.innerHTML = savedAddresses.map(addr => `
        <div class="address-card ${selectedAddressId === addr.id ? 'address-card--selected' : ''}" data-id="${addr.id}">
          <div class="address-card__info">
            <p class="address-card__name">${addr.nombre_destinatario}</p>
            <p class="address-card__detail">${addr.calle}, ${addr.ciudad}${addr.region ? ', ' + addr.region : ''}</p>
            ${addr.telefono ? `<p class="address-card__detail">${addr.telefono}</p>` : ''}
          </div>
          <button class="address-card__delete" data-id="${addr.id}" type="button" aria-label="Eliminar">&#x2715;</button>
        </div>
      `).join('');

      // Seleccionar primera por defecto
      if (!selectedAddressId && savedAddresses.length > 0) {
        selectAddress(savedAddresses[0].id);
      }

      list.querySelectorAll('.address-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.address-card__delete')) return;
          selectAddress(Number(card.dataset.id));
        });
      });

      list.querySelectorAll('.address-card__delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = Number(btn.dataset.id);
          await deleteAddress(id);
        });
      });
    }

    function selectAddress(id) {
      selectedAddressId = id;
      hideForm();
      renderAddresses();
    }

    function showForm() {
      selectedAddressId = null;
      addressForm.style.display = 'block';
      renderAddresses();
    }

    function hideForm() {
      addressForm.style.display = 'none';
    }

    async function deleteAddress(id) {
      try {
        await fetch(`${API_URL}/api/user/addresses/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        savedAddresses = savedAddresses.filter(a => a.id !== id);
        if (selectedAddressId === id) selectedAddressId = null;
        renderAddresses();
      } catch {
        // silencioso
      }
    }

    addNewAddressBtn.addEventListener('click', showForm);

    await loadAddresses();

  } else {
    guestNotice.style.display = 'block';
    addressForm.style.display = 'block';
  }

  // ── Validar formulario ────────────────────────────────────
  function getFormData() {
    return {
      nombre_destinatario: document.getElementById('nombre_destinatario').value.trim(),
      calle: document.getElementById('calle').value.trim(),
      ciudad: document.getElementById('ciudad').value.trim(),
      region: document.getElementById('region').value.trim(),
      codigo_postal: document.getElementById('codigo_postal').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
    };
  }

  function validateForm(data) {
    let valid = true;
    document.getElementById('errorNombre').textContent = '';
    document.getElementById('errorCalle').textContent = '';
    document.getElementById('errorCiudad').textContent = '';
    document.getElementById('errorGeneral').textContent = '';

    if (!data.nombre_destinatario) {
      document.getElementById('errorNombre').textContent = 'El nombre es requerido';
      valid = false;
    }
    if (!data.calle) {
      document.getElementById('errorCalle').textContent = 'La calle es requerida';
      valid = false;
    }
    if (!data.ciudad) {
      document.getElementById('errorCiudad').textContent = 'La ciudad es requerida';
      valid = false;
    }
    return valid;
  }

  // ── Confirmar pedido ──────────────────────────────────────
  const confirmBtn = document.getElementById('confirmBtn');
  const confirmMsg = document.getElementById('confirmMsg');

  confirmBtn.addEventListener('click', async () => {
    document.getElementById('errorGeneral').textContent = '';
    let address = null;

    if (selectedAddressId) {
      const allRes  = await fetch(`${API_URL}/api/user/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      const allAddr = await allRes.json();
      const saved   = allAddr.find(a => a.id === selectedAddressId);
      if (!saved) { document.getElementById('errorGeneral').textContent = 'Selecciona una dirección válida'; return; }
      address = { nombre_destinatario: saved.nombre_destinatario, calle: saved.calle, ciudad: saved.ciudad, region: saved.region, codigo_postal: saved.codigo_postal, telefono: saved.telefono };
    } else {
      address = getFormData();
      if (!validateForm(address)) return;
      if (isLoggedIn && document.getElementById('saveAddress').checked) {
        try {
          const res = await fetch(`${API_URL}/api/user/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(address)
          });
          if (!res.ok) { const err = await res.json(); document.getElementById('errorGeneral').textContent = err.error || 'Error al guardar dirección'; return; }
        } catch { document.getElementById('errorGeneral').textContent = 'Error de conexión'; return; }
      }
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ address, items: cartItems })
      });

      if (!res.ok) {
        const err = await res.json();
        document.getElementById('errorGeneral').textContent = err.error || 'Error al procesar pedido';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar pedido';
        return;
      }

      const { orderId } = await res.json();
      Cart.clearAll();
      confirmBtn.style.display = 'none';
      confirmMsg.style.display = 'block';
      confirmMsg.innerHTML = `
        <span class="checkout__confirm-icon">&#10003;</span>
        ¡Pedido #${orderId} confirmado! Te contactaremos pronto para coordinar la entrega.
        ${isLoggedIn ? '<br><a href="profile.html" style="color:#8fe3ff;font-size:0.9rem;">Ver mis pedidos →</a>' : ''}
      `;
    } catch {
      document.getElementById('errorGeneral').textContent = 'Error de conexión';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar pedido';
    }
  });
});
