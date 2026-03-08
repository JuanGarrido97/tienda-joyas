document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const productId = parseInt(params.get('id'));

  if (!productId) {
    window.location.href = 'index.html';
    return;
  }

  function formatPrice(price) {
    return '$' + price.toLocaleString('es-CL');
  }

  const metalNames = {
    'platino': 'Platino',
    'oro-blanco': 'Oro Blanco',
    'oro': 'Oro',
    'plata': 'Plata',
    'cobre': 'Cobre',
    'bronze': 'Bronze'
  };

  const categoryNames = {
    'anillos': 'Anillos',
    'aros': 'Aros',
    'pulseras': 'Pulseras',
    'collares': 'Collares'
  };

  // ── Lightbox ───────────────────────────────────────────────
  let lightboxImages = [];
  let lightboxIndex  = 0;

  const lightboxEl  = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  function openLightbox(images, index) {
    lightboxImages = images;
    lightboxIndex  = index;
    lightboxImg.src = lightboxImages[lightboxIndex];
    lightboxEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightboxEl.style.display = 'none';
    document.body.style.overflow = '';
  }

  function lightboxStep(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
    lightboxImg.src = lightboxImages[lightboxIndex];
  }

  lightboxEl.querySelector('.lightbox__overlay').addEventListener('click', closeLightbox);
  lightboxEl.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  lightboxEl.querySelector('.lightbox__prev').addEventListener('click', () => lightboxStep(-1));
  lightboxEl.querySelector('.lightbox__next').addEventListener('click', () => lightboxStep(1));

  document.addEventListener('keydown', (e) => {
    if (lightboxEl.style.display === 'none') return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lightboxStep(-1);
    if (e.key === 'ArrowRight')  lightboxStep(1);
  });

  // ── Producto principal ────────────────────────────────────
  fetch(`http://localhost:3000/api/products/${productId}`)
    .then(res => {
      if (!res.ok) { window.location.href = 'index.html'; return null; }
      return res.json();
    })
    .then(product => {
      if (!product) return;

      document.title = `${product.name} | Tienda`;

      document.querySelector('.product-detail__name').textContent = product.name;
      document.querySelector('.product-detail__price').textContent = formatPrice(product.price);
      document.querySelector('.product-detail__description').textContent = product.description;
      document.querySelector('.product-detail__category').textContent = categoryNames[product.category] || product.category;
      document.querySelector('.product-detail__metal').textContent = metalNames[product.metal] || product.metal;

      const stockEl = document.querySelector('.product-detail__stock');
      const btnBuy  = document.querySelector('.product-detail__btn--buy');
      const btnCart = document.querySelector('.product-detail__btn--cart');

      if (product.stock > 0) {
        stockEl.textContent = `Stock disponible: ${product.stock} unidades`;

        btnCart.addEventListener('click', () => {
          Cart.add(product);
          btnCart.textContent = '¡Agregado!';
          setTimeout(() => { btnCart.textContent = 'Agregar al carro'; }, 1500);
        });

        btnBuy.addEventListener('click', () => {
          Cart.add(product);
          Cart.open();
        });
      } else {
        stockEl.textContent = 'Agotado';
        stockEl.classList.add('product-detail__stock--out');
        btnBuy.disabled  = true;
        btnCart.disabled = true;
        btnBuy.style.opacity  = '0.4';
        btnCart.style.opacity = '0.4';
        btnBuy.style.cursor   = 'not-allowed';
        btnCart.style.cursor  = 'not-allowed';
      }

      // Lightbox: conectar al carousel después de que cargue
      setTimeout(() => {
        const carouselSlides = document.querySelectorAll('.carousel__slide');
        if (carouselSlides.length > 0) {
          const images = Array.from(carouselSlides).map(s => s.style.backgroundImage.replace(/url\(["']?|["']?\)/g, ''));
          carouselSlides.forEach((slide, i) => {
            slide.style.cursor = 'zoom-in';
            slide.addEventListener('click', () => openLightbox(images, i));
          });
        }
      }, 800);

      // Productos relacionados
      loadRelated(product.category, product.id);
    });

  // ── Productos relacionados ────────────────────────────────
  function loadRelated(category, currentId) {
    fetch(`http://localhost:3000/api/products`)
      .then(res => res.json())
      .then(products => {
        const related = products
          .filter(p => p.category === category && p.id !== currentId)
          .slice(0, 4);

        if (related.length === 0) return;

        const section = document.getElementById('relatedSection');
        const grid    = document.getElementById('relatedGrid');

        grid.innerHTML = related.map(p => `
          <a href="product.html?id=${p.id}" class="related-card">
            <div class="related-card__img" style="background-image: url('${p.image}')"></div>
            <div class="related-card__info">
              <p class="related-card__name">${p.name}</p>
              <p class="related-card__price">${formatPrice(p.price)}</p>
            </div>
          </a>
        `).join('');

        section.style.display = 'block';
      })
      .catch(() => {});
  }
});
