// ============================================
// ADMINISTRADOR - GESTIÓN DE PRODUCTOS E IMÁGENES
// ============================================

const API_URL = 'http://localhost:3000';
let currentProductId = null;
let uploadedImages = [];

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProducts();
    setupDragDrop();
});

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');

    if (!token || !user) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        const userData = JSON.parse(user);
        document.getElementById('adminName').textContent = `Hola, ${userData.name}`;
    } catch (e) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = 'admin-login.html';
    }
}

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = 'admin-login.html';
    }
}

// ============================================
// GESTIÓN DE PRODUCTOS
// ============================================

// Cargar todos los productos
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/api/products`);
        const products = await res.json();

        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #9ca3af;">No hay productos</td></tr>';
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${product.id}</td>
                <td>${product.name}</td>
                <td>$${product.price.toLocaleString()}</td>
                <td>${product.category || '-'}</td>
                <td>${product.metal || '-'}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editProduct(${product.id})">Editar</button>
                    <button class="action-btn btn-delete" onclick="deleteProduct(${product.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        showMessage('Error al cargar productos', 'error');
    }
}

// Abrir modal para nuevo producto
function openProductModal() {
    currentProductId = null;
    uploadedImages = [];
    document.getElementById('modalTitle').textContent = 'Nuevo Producto';
    document.getElementById('productForm').reset();
    document.getElementById('imagesPreview').innerHTML = '';
    document.getElementById('productModal').classList.add('active');
}

// Cerrar modal
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProductId = null;
    uploadedImages = [];
    document.getElementById('productForm').reset();
    document.getElementById('imagesPreview').innerHTML = '';
}

// Editar producto
async function editProduct(id) {
    try {
        const res = await fetch(`${API_URL}/api/products/${id}`);
        const product = await res.json();

        currentProductId = id;
        uploadedImages = [];
        document.getElementById('modalTitle').textContent = 'Editar Producto';
        document.getElementById('nombre').value = product.name;
        document.getElementById('descripcion').value = product.description;
        document.getElementById('precio').value = product.price;
        document.getElementById('categoria').value = product.category;
        document.getElementById('metal').value = product.metal;
        document.getElementById('stock').value = product.stock;

        // Cargar imágenes existentes
        await loadProductImages(id);

        document.getElementById('productModal').classList.add('active');
    } catch (err) {
        showMessage('Error al cargar producto', 'error');
    }
}

// Cargar imágenes del producto
async function loadProductImages(productId) {
    try {
        const res = await fetch(`${API_URL}/api/products/${productId}/images`);
        if (res.ok) {
            uploadedImages = await res.json();
            renderImagesPreview();
        }
    } catch (err) {
        console.error('Error al cargar imágenes:', err);
    }
}

// Renderizar preview de imágenes
function renderImagesPreview() {
    const container = document.getElementById('imagesPreview');
    container.innerHTML = '';

    uploadedImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${img.url}" alt="Imagen ${index + 1}">
            <button type="button" class="remove-btn" onclick="removeImage(${img.id})">✕</button>
            <span class="order-badge">${index + 1}</span>
        `;
        container.appendChild(div);
    });
}

// Eliminar imagen
async function removeImage(imageId) {
    if (!confirm('¿Eliminar esta imagen?')) return;

    const token = localStorage.getItem('admin_token');

    try {
        const res = await fetch(`${API_URL}/api/admin/products/${currentProductId}/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            uploadedImages = uploadedImages.filter(img => img.id !== imageId);
            renderImagesPreview();
            showMessage('Imagen eliminada', 'success');
        }
    } catch (err) {
        showMessage('Error al eliminar imagen', 'error');
    }
}

// Guardar o crear producto
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('admin_token');
    const formData = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precio: parseInt(document.getElementById('precio').value),
        categoria: document.getElementById('categoria').value,
        metal: document.getElementById('metal').value,
        stock: parseInt(document.getElementById('stock').value),
        imagen: document.getElementById('imagen').value
    };

    try {
        let res;

        if (currentProductId) {
            res = await fetch(`${API_URL}/api/admin/products/${currentProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
        } else {
            res = await fetch(`${API_URL}/api/admin/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
        }

        const data = await res.json();

        if (res.ok) {
            showMessage(data.message, 'success');
            closeProductModal();
            loadProducts();
        } else {
            showMessage(data.error || 'Error al guardar producto', 'error');
        }
    } catch (err) {
        showMessage('Error de conexión', 'error');
    }
});

// Eliminar producto
async function deleteProduct(id) {
    if (!confirm('¿Estás seguro que deseas eliminar este producto?')) {
        return;
    }

    const token = localStorage.getItem('admin_token');

    try {
        const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            showMessage('Producto eliminado', 'success');
            loadProducts();
        } else {
            showMessage(data.error || 'Error al eliminar producto', 'error');
        }
    } catch (err) {
        showMessage('Error de conexión', 'error');
    }
}

// ============================================
// DRAG & DROP DE IMÁGENES
// ============================================

function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

async function handleFiles(files) {
    if (!currentProductId) {
        showMessage('Debes crear o editar un producto primero', 'error');
        return;
    }

    for (let file of files) {
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Archivo muy grande (máx 5MB)', 'error');
            continue;
        }

        // Validar formato
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showMessage('Formato no permitido. Usa JPEG, PNG o WebP', 'error');
            continue;
        }

        await uploadImage(file);
    }
}

async function uploadImage(file) {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(`${API_URL}/api/admin/products/${currentProductId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            uploadedImages.push({
                id: data.imageId,
                url: data.url,
                orden: data.orden
            });
            renderImagesPreview();
            showMessage('Imagen subida exitosamente', 'success');
        } else {
            showMessage(data.error || 'Error al subir imagen', 'error');
        }
    } catch (err) {
        showMessage('Error de conexión', 'error');
    }
}

// ============================================
// UTILIDADES
// ============================================

function showMessage(text, type) {
    const box = document.getElementById('messageBox');
    box.textContent = text;
    box.className = `message ${type}`;
    box.style.display = 'block';

    setTimeout(() => {
        box.style.display = 'none';
    }, 4000);
}

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProductModal();
    }
});
