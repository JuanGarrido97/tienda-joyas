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

  fetch('data/products.json')
    .then(res => res.json())
    .then(products => {
      const product = products.find(p => p.id === productId);

      if (!product) {
        window.location.href = 'index.html';
        return;
      }

      document.title = `${product.name} | Tienda`;

      document.querySelector('.product-detail__image').style.backgroundImage = `url('${product.image}')`;
      document.querySelector('.product-detail__name').textContent = product.name;
      document.querySelector('.product-detail__price').textContent = formatPrice(product.price);
      document.querySelector('.product-detail__description').textContent = product.description;
      document.querySelector('.product-detail__category').textContent = categoryNames[product.category] || product.category;
      document.querySelector('.product-detail__metal').textContent = metalNames[product.metal] || product.metal;

      const stockEl = document.querySelector('.product-detail__stock');
      if (product.stock > 0) {
        stockEl.textContent = `Stock disponible: ${product.stock} unidades`;
      } else {
        stockEl.textContent = 'Agotado';
        stockEl.classList.add('product-detail__stock--out');
      }
    });
});
