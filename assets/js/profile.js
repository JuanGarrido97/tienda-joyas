document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000';

  function getToken() { return localStorage.getItem('tienda_token'); }
  function getUser()  { const u = localStorage.getItem('tienda_current_user'); return u ? JSON.parse(u) : null; }

  // Redirigir si no está logueado
  if (!getToken() || !getUser()) {
    window.location.href = 'login.html';
    return;
  }

  // ── Navegación entre secciones ────────────────────────────
  const navBtns = document.querySelectorAll('.profile__nav-btn[data-section]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('profile__nav-btn--active'));
      btn.classList.add('profile__nav-btn--active');
      document.querySelectorAll('.profile__section').forEach(s => s.classList.add('profile__section--hidden'));
      document.getElementById(`section-${btn.dataset.section}`).classList.remove('profile__section--hidden');
    });
  });

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('tienda_token');
    localStorage.removeItem('tienda_current_user');
    localStorage.removeItem('tienda_remember');
    window.location.href = 'index.html';
  });

  // ── Cargar perfil ─────────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) { window.location.href = 'login.html'; return; }
      const data = await res.json();
      document.getElementById('profileName').value  = data.name;
      document.getElementById('profileEmail').value = data.email;
    } catch {
      // silencioso
    }
  }

  await loadProfile();

  // ── Actualizar perfil ─────────────────────────────────────
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('profileNameError').textContent    = '';
    document.getElementById('profileEmailError').textContent   = '';
    document.getElementById('profileGeneralError').textContent = '';
    document.getElementById('profileSuccess').style.display    = 'none';

    const name  = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();

    try {
      const res  = await fetch(`${API_URL}/api/user/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (res.ok) {
        // Actualizar localStorage con nuevo nombre/email
        const user = getUser();
        user.name  = data.user.name;
        user.email = data.user.email;
        localStorage.setItem('tienda_current_user', JSON.stringify(user));
        document.getElementById('profileSuccess').style.display = 'block';
      } else {
        document.getElementById('profileGeneralError').textContent = data.error || 'Error al actualizar';
      }
    } catch {
      document.getElementById('profileGeneralError').textContent = 'Error de conexión';
    }
  });

  // ── Cambiar contraseña ────────────────────────────────────
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('passwordError').textContent   = '';
    document.getElementById('passwordSuccess').style.display = 'none';

    const currentPassword    = document.getElementById('currentPassword').value;
    const newPassword        = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      document.getElementById('passwordError').textContent = 'Las contraseñas no coinciden';
      return;
    }

    try {
      const res  = await fetch(`${API_URL}/api/user/password`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('passwordSuccess').style.display = 'block';
        document.getElementById('passwordForm').reset();
      } else {
        document.getElementById('passwordError').textContent = data.error || 'Error al cambiar contraseña';
      }
    } catch {
      document.getElementById('passwordError').textContent = 'Error de conexión';
    }
  });

  // ── Direcciones ───────────────────────────────────────────
  let addresses = [];

  async function loadAddresses() {
    try {
      const res = await fetch(`${API_URL}/api/user/addresses`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      addresses = await res.json();
      renderAddresses();
    } catch {
      renderAddresses();
    }
  }

  function renderAddresses() {
    const list = document.getElementById('profileAddressList');
    if (addresses.length === 0) {
      list.innerHTML = '<p class="profile__empty">No tienes direcciones guardadas.</p>';
      return;
    }
    list.innerHTML = addresses.map(addr => `
      <div class="profile-address-card">
        <div class="profile-address-card__info">
          <p class="profile-address-card__name">${addr.nombre_destinatario}</p>
          <p class="profile-address-card__detail">${addr.calle}, ${addr.ciudad}${addr.region ? ', ' + addr.region : ''}</p>
          ${addr.codigo_postal ? `<p class="profile-address-card__detail">CP: ${addr.codigo_postal}</p>` : ''}
          ${addr.telefono ? `<p class="profile-address-card__detail">${addr.telefono}</p>` : ''}
        </div>
        <button class="profile-address-card__delete" data-id="${addr.id}" type="button">Eliminar</button>
      </div>
    `).join('');

    list.querySelectorAll('.profile-address-card__delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(`${API_URL}/api/user/addresses/${btn.dataset.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        addresses = addresses.filter(a => a.id !== Number(btn.dataset.id));
        renderAddresses();
      });
    });
  }

  // Mostrar/ocultar form de nueva dirección
  const toggleBtn  = document.getElementById('toggleAddressForm');
  const cancelBtn  = document.getElementById('cancelAddressForm');
  const addrForm   = document.getElementById('newAddressForm');

  toggleBtn.addEventListener('click', () => { addrForm.style.display = 'block'; toggleBtn.style.display = 'none'; });
  cancelBtn.addEventListener('click', () => { addrForm.style.display = 'none';  toggleBtn.style.display = 'block'; addrForm.reset(); });

  addrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('addressError').textContent = '';
    const data = {
      nombre_destinatario: document.getElementById('addr_nombre').value.trim(),
      calle:               document.getElementById('addr_calle').value.trim(),
      ciudad:              document.getElementById('addr_ciudad').value.trim(),
      region:              document.getElementById('addr_region').value.trim(),
      codigo_postal:       document.getElementById('addr_cp').value.trim(),
      telefono:            document.getElementById('addr_tel').value.trim(),
    };
    try {
      const res = await fetch(`${API_URL}/api/user/addresses`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(data)
      });
      const json = await res.json();
      if (res.ok) {
        addrForm.reset();
        addrForm.style.display  = 'none';
        toggleBtn.style.display = 'block';
        await loadAddresses();
      } else {
        document.getElementById('addressError').textContent = json.error || 'Error al guardar';
      }
    } catch {
      document.getElementById('addressError').textContent = 'Error de conexión';
    }
  });

  // Cargar direcciones al cambiar a esa sección
  document.querySelector('[data-section="addresses"]').addEventListener('click', loadAddresses);

  // ── Pedidos ───────────────────────────────────────────────
  function formatPrice(p) { return '$' + Number(p).toLocaleString('es-CL'); }
  function formatDate(d)  { return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }); }

  const estadoBadge = {
    pendiente:  { label: 'Pendiente',  cls: 'badge--yellow' },
    enviado:    { label: 'Enviado',    cls: 'badge--blue'   },
    entregado:  { label: 'Entregado',  cls: 'badge--green'  },
    cancelado:  { label: 'Cancelado',  cls: 'badge--red'    },
  };

  async function loadOrders() {
    const listEl   = document.getElementById('ordersList');
    const detailEl = document.getElementById('orderDetail');
    listEl.style.display   = 'block';
    detailEl.style.display = 'none';

    try {
      const res    = await fetch(`${API_URL}/api/user/orders`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const orders = await res.json();

      if (!orders.length) {
        listEl.innerHTML = '<p class="profile__empty">No tienes pedidos aún.</p>';
        return;
      }

      listEl.innerHTML = orders.map(o => {
        const b = estadoBadge[o.estado] || { label: o.estado, cls: '' };
        return `
          <div class="order-card" data-id="${o.id}">
            <div class="order-card__info">
              <span class="order-card__id">Pedido #${o.id}</span>
              <span class="order-card__date">${formatDate(o.creado_en)}</span>
            </div>
            <div class="order-card__right">
              <span class="order-card__total">${formatPrice(o.total)}</span>
              <span class="order-badge ${b.cls}">${b.label}</span>
              <button class="order-card__detail-btn" data-id="${o.id}" type="button">Ver detalle</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.order-card__detail-btn').forEach(btn => {
        btn.addEventListener('click', () => showOrderDetail(Number(btn.dataset.id)));
      });
    } catch {
      listEl.innerHTML = '<p class="profile__empty">Error al cargar pedidos.</p>';
    }
  }

  async function showOrderDetail(id) {
    const listEl   = document.getElementById('ordersList');
    const detailEl = document.getElementById('orderDetail');
    const contentEl = document.getElementById('orderDetailContent');

    listEl.style.display   = 'none';
    detailEl.style.display = 'block';
    contentEl.innerHTML    = '<p class="profile__empty">Cargando...</p>';

    try {
      const res   = await fetch(`${API_URL}/api/user/orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const order = await res.json();
      const b     = estadoBadge[order.estado] || { label: order.estado, cls: '' };

      contentEl.innerHTML = `
        <div class="order-detail__header">
          <div>
            <h3 class="order-detail__title">Pedido #${order.id}</h3>
            <p class="order-detail__date">${formatDate(order.creado_en)}</p>
          </div>
          <span class="order-badge ${b.cls}">${b.label}</span>
        </div>
        <div class="order-detail__address">
          <p class="order-detail__label">Dirección de envío</p>
          <p>${order.nombre_destinatario}</p>
          <p>${order.calle}, ${order.ciudad}${order.region ? ', ' + order.region : ''}</p>
          ${order.telefono ? `<p>${order.telefono}</p>` : ''}
        </div>
        <div class="order-detail__items">
          <p class="order-detail__label">Productos</p>
          ${order.items.map(i => `
            <div class="order-detail__item">
              <span class="order-detail__item-name">${i.nombre}</span>
              <span class="order-detail__item-qty">x${i.cantidad}</span>
              <span class="order-detail__item-price">${formatPrice(i.precio * i.cantidad)}</span>
            </div>
          `).join('')}
        </div>
        <div class="order-detail__total">
          <span>Total</span>
          <span>${formatPrice(order.total)}</span>
        </div>
      `;
    } catch {
      contentEl.innerHTML = '<p class="profile__empty">Error al cargar el pedido.</p>';
    }
  }

  document.getElementById('backToOrders').addEventListener('click', loadOrders);
  document.querySelector('[data-section="orders"]').addEventListener('click', loadOrders);
});
