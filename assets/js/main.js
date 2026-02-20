document.addEventListener('DOMContentLoaded', () => {
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
      card.href = `product.html?id=${product.id}`;
      card.classList.add('product-card');

      if (product.stock <= 0) card.classList.add('product-card--out');

      card.innerHTML = `
        <div class="product-card__img" style="background-image: url('${product.image}')"></div>
        <h4 class="product-card__name">${product.name}</h4>
        <p class="product-card__price">${formatPrice(product.price)}</p>
        <span class="product-card__stock">${product.stock > 0 ? 'Stock: ' + product.stock : 'Agotado'}</span>
      `;

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

  function filterProducts() {
    if (isAnimating) return;

    const activeCategories = [];
    const activeMetals = [];

    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const group = cb.closest('.filters__group').querySelector('.filters__heading').textContent.trim();
      if (group === 'Joyas') activeCategories.push(cb.value);
      else if (group === 'Metales') activeMetals.push(cb.value);
    });

    let filtered = allProducts;

    if (activeCategories.length > 0) {
      filtered = filtered.filter(p => activeCategories.includes(p.category));
    }
    if (activeMetals.length > 0) {
      filtered = filtered.filter(p => activeMetals.includes(p.metal));
    }

    renderProducts(filtered);
  }

  checkboxes.forEach(cb => cb.addEventListener('change', filterProducts));

  // Nav dropdown links activan filtros del sidebar
  document.querySelectorAll('.nav__dropdown-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const value = link.textContent.trim().toLowerCase().replace(' ', '-');
      checkboxes.forEach(cb => { cb.checked = false; });
      checkboxes.forEach(cb => {
        if (cb.value === value) cb.checked = true;
      });
      filterProducts();
    });
  });

  document.querySelector('.filters__clear').addEventListener('click', () => {
    checkboxes.forEach(cb => { cb.checked = false; });
    filterProducts();
  });

  fetch('data/products.json')
    .then(res => res.json())
    .then(products => {
      allProducts = products;
      renderProducts(allProducts);
    });
});
