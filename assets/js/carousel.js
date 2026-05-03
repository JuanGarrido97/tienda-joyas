// ============================================
// CLASE CARRUSEL DE PRODUCTOS
// ============================================

class ProductCarousel {
  constructor(containerId, productId) {
    this.container = document.getElementById(containerId);
    this.productId = productId;
    this.images = [];
    this.currentIndex = 0;

    if (this.container) {
      this.init();
    }
  }

  async init() {
    await this.loadImages();
    this.render();
    this.addEventListeners();
  }

  async loadImages() {
    // Usar imágenes pre-cargadas por el servidor si están disponibles
    if (window.__PRODUCT_IMAGES__ && window.__PRODUCT_IMAGES__.length > 0) {
      this.images = window.__PRODUCT_IMAGES__.map((url, i) => ({ url, orden: i }));
      return;
    }

    try {
      const [imagesRes, productRes] = await Promise.all([
        fetch(`http://localhost:3000/api/products/${this.productId}/images`),
        fetch(`http://localhost:3000/api/products/${this.productId}`)
      ]);
      if (imagesRes.ok) {
        this.images = await imagesRes.json();
      }
      if (this.images.length === 0 && productRes.ok) {
        const product = await productRes.json();
        if (product.image) {
          this.images = [{ url: product.image, orden: 0 }];
        }
      }
    } catch (err) {
      console.error('Error de conexión:', err);
    }
  }

  render() {
    if (this.images.length === 0) {
      this.container.innerHTML = '<p style="text-align: center; color: #9ca3af;">No hay imágenes disponibles</p>';
      return;
    }

    this.container.innerHTML = `
      <div class="product-carousel">
        <div class="carousel-main">
          <img id="mainImage" src="${this.images[this.currentIndex].url}" alt="Producto">
        </div>

        <div class="carousel-thumbnails" id="thumbnailsContainer">
          ${this.images.map((img, i) => `
            <div class="carousel-thumb ${i === this.currentIndex ? 'active' : ''}" data-index="${i}">
              <img src="${img.url}" alt="Thumbnail ${i + 1}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  addEventListeners() {
    if (this.images.length <= 1) return;

    // Botones prev/next
    document.getElementById('prevBtn')?.addEventListener('click', () => this.prev());
    document.getElementById('nextBtn')?.addEventListener('click', () => this.next());

    // Thumbnails
    document.querySelectorAll('.carousel-thumb').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.goToIndex(index);
      });
    });

    // Teclado (izquierda/derecha)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  }

  goToIndex(index) {
    if (index < 0 || index >= this.images.length) return;

    this.currentIndex = index;
    this.updateDisplay();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateDisplay();
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateDisplay();
  }

  updateDisplay() {
    // Actualizar imagen principal
    document.getElementById('mainImage').src = this.images[this.currentIndex].url;

    // Actualizar índice
    const currentSpan = document.getElementById('currentIndex');
    if (currentSpan) currentSpan.textContent = this.currentIndex + 1;

    // Actualizar thumbnails activos
    document.querySelectorAll('.carousel-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === this.currentIndex);
    });

    // Scroll automático de thumbnails
    const thumbsContainer = document.getElementById('thumbnailsContainer');
    const activeThumb = document.querySelector('.carousel-thumb.active');
    if (activeThumb && thumbsContainer) {
      const thumbOffset = activeThumb.offsetLeft - thumbsContainer.offsetLeft;
      const containerCenter = thumbsContainer.clientWidth / 2;
      const scrollLeft = thumbOffset - containerCenter + activeThumb.offsetWidth / 2;

      thumbsContainer.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }
}

// Inicializar carrusel cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  // Soporta /producto/3 (SSR) y product.html?id=3 (legado)
  const pathMatch = window.location.pathname.match(/\/producto\/(\d+)/);
  const params = new URLSearchParams(window.location.search);
  const productId = pathMatch ? pathMatch[1] : params.get('id');

  if (productId) {
    window.carousel = new ProductCarousel('carouselContainer', productId);
  }
});
