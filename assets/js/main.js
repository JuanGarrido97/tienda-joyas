document.addEventListener('DOMContentLoaded', () => {
  // ── Toggle filtros mobile ─────────────────────────────────
  const filtersToggle = document.getElementById('filtersToggle');
  const filtersAside  = document.getElementById('filtersAside');
  if (filtersToggle && filtersAside) {
    filtersToggle.addEventListener('click', () => {
      filtersAside.classList.toggle('filters--visible');
      filtersToggle.textContent = filtersAside.classList.contains('filters--visible')
        ? '✕ Cerrar filtros'
        : '☰ Filtros';
    });
  }

  // ── Hamburger ─────────────────────────────────────────────
  const hamburger = document.getElementById('navHamburger');
  const navMenu   = document.getElementById('navMenu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('nav__menu--open');
      hamburger.classList.toggle('nav__hamburger--open', open);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav__container')) {
        navMenu.classList.remove('nav__menu--open');
        hamburger.classList.remove('nav__hamburger--open');
      }
    });
  }

  // Nav dropdowns
  const dropdowns = document.querySelectorAll('.nav__item--dropdown');

  dropdowns.forEach(item => {
    item.querySelector('.nav__link').addEventListener('click', () => {
      dropdowns.forEach(other => {
        if (other !== item) other.classList.remove('active');
      });
      item.classList.toggle('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--dropdown')) {
      dropdowns.forEach(item => item.classList.remove('active'));
    }
  });

  // Productos
  const grid = document.querySelector('.products__grid');
  const checkboxes = document.querySelectorAll('.filters__option input[type="checkbox"]');
  let allProducts = [];
  let isAnimating = false;

  function formatPrice(price) {
    return '$' + price.toLocaleString('es-CL');
  }

  function createCards(products) {
    grid.innerHTML = '';

    if (products.length === 0) {
      grid.innerHTML = '<p class="products__empty">No se encontraron productos.</p>';
      gsap.from('.products__empty', { opacity: 0, y: 20, duration: 0.4 });
      return;
    }

    products.forEach(product => {
      const card = document.createElement('a');
      card.href = `/producto/${product.id}`;
      card.classList.add('product-card');

      if (product.stock <= 0) card.classList.add('product-card--out');

      card.innerHTML = `
        <div class="product-card__img" style="background-image: url('${product.image}')"></div>
        <h4 class="product-card__name">${product.name}</h4>
        <p class="product-card__price">${formatPrice(product.price)}</p>
        <span class="product-card__stock">${product.stock > 0 ? 'Stock: ' + product.stock : 'Agotado'}</span>
        ${product.stock > 0 ? '<button class="product-card__add-btn" type="button">Agregar al carro</button>' : ''}
      `;

      if (product.stock > 0) {
        const addBtn = card.querySelector('.product-card__add-btn');
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          Cart.add(product);
          addBtn.textContent = '¡Agregado!';
          setTimeout(() => { addBtn.textContent = 'Agregar al carro'; }, 1500);
        });
      }

      grid.appendChild(card);
    });
  }

  function animateIn() {
    const cards = grid.querySelectorAll('.product-card');
    if (cards.length === 0) {
      isAnimating = false;
      return;
    }

    gsap.from(cards, {
      opacity: 0,
      y: 30,
      duration: 0.45,
      stagger: 0.07,
      ease: 'power3.out',
      clearProps: 'all',
      onComplete: () => { isAnimating = false; }
    });
  }

  function renderProducts(products, animate = true) {
    if (!animate) {
      createCards(products);
      return;
    }

    isAnimating = true;
    grid.style.minHeight = grid.offsetHeight + 'px';
    const currentCards = grid.querySelectorAll('.product-card');

    if (currentCards.length > 0) {
      gsap.to(currentCards, {
        opacity: 0,
        y: -20,
        duration: 0.25,
        stagger: 0.04,
        ease: 'power2.in',
        onComplete: () => {
          createCards(products);
          animateIn();
          grid.style.minHeight = '';
        }
      });
    } else {
      createCards(products);
      animateIn();
      grid.style.minHeight = '';
    }
  }

  const searchInput = document.querySelector('.nav__search-input');

  function filterProducts() {
    if (isAnimating) return;

    const activeCategories = [];
    const activeMetals = [];
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const group = cb.closest('.filters__group').querySelector('.filters__heading').textContent.trim();
      if (group === 'Joyas') activeCategories.push(cb.value);
      else if (group === 'Metales') activeMetals.push(cb.value);
    });

    let filtered = allProducts;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        (p.description && p.description.toLowerCase().includes(searchQuery))
      );
    }
    if (activeCategories.length > 0) {
      filtered = filtered.filter(p => activeCategories.includes(p.category));
    }
    if (activeMetals.length > 0) {
      filtered = filtered.filter(p => activeMetals.includes(p.metal));
    }

    renderProducts(filtered);
  }

  checkboxes.forEach(cb => cb.addEventListener('change', filterProducts));
  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
  }

  // Nav dropdown links activan filtros del sidebar
  document.querySelectorAll('.nav__dropdown-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const value = link.textContent.trim().toLowerCase().replace(' ', '-');
      checkboxes.forEach(cb => { cb.checked = false; });
      checkboxes.forEach(cb => {
        if (cb.value === value) cb.checked = true;
      });
      if (searchInput) searchInput.value = '';
      filterProducts();
    });
  });

  document.querySelector('.filters__clear').addEventListener('click', () => {
    checkboxes.forEach(cb => { cb.checked = false; });
    if (searchInput) searchInput.value = '';
    filterProducts();
  });

  // Skeletons mientras carga
  const SKELETON_COUNT = 8;
  grid.innerHTML = Array(SKELETON_COUNT).fill('<div class="product-card-skeleton"></div>').join('');

  fetch('http://localhost:3000/api/products')
    .then(res => res.json())
    .then(products => {
      allProducts = products;
      renderProducts(allProducts);
      initFeatured(allProducts);
    })
    .catch(() => {
      grid.innerHTML = '<p class="products__empty">Error al cargar productos.</p>';
    });

  // ── Sección destacados ────────────────────────────────────
  function initFeatured(products) {
    const section  = document.getElementById('featuredSection');
    const track    = document.getElementById('featuredTrack');
    const tabs     = document.querySelectorAll('.featured__tab');
    if (!section || !track || products.length === 0) return;

    const bestsellers = [...products].slice(0, 6);
    const newest      = [...products].reverse().slice(0, 6);

    function renderFeaturedCards(list) {
      track.innerHTML = list.map(p => `
        <a href="/producto/${p.id}" class="featured-card">
          <div class="featured-card__img" style="background-image:url('${p.image}')"></div>
          <p class="featured-card__name">${p.name}</p>
          <p class="featured-card__price">${formatPrice(p.price)}</p>
        </a>
      `).join('');
    }

    renderFeaturedCards(bestsellers);
    section.style.display = 'block';

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('featured__tab--active'));
        tab.classList.add('featured__tab--active');
        const list = tab.dataset.tab === 'new' ? newest : bestsellers;
        track.style.opacity = '0';
        setTimeout(() => {
          renderFeaturedCards(list);
          track.style.opacity = '1';
        }, 180);
      });
    });
  }
});
