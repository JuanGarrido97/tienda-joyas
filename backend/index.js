require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const sharp   = require('sharp');
const path    = require('path');
const fs      = require('fs');
const pool    = require('./db');

const app     = express();
const PORT    = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// ============================================
// MOTOR DE VISTAS Y ARCHIVOS ESTÁTICOS
// ============================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..')));

// ============================================
// CONFIGURACIÓN DE MULTER
// ============================================

const uploadDir = path.join(__dirname, '../assets/img/products');

// Crear carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error('Formato de imagen no permitido'));
    } else {
      cb(null, true);
    }
  }
});

// ============================================
// MIDDLEWARES
// ============================================

app.use(cors());
app.use(express.json());

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar que sea admin
const verifyAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id FROM administradores WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(403).json({ error: 'No autorizado' });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

// ============================================
// RUTAS DE PRODUCTOS
// ============================================

// Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre AS name, descripcion AS description, precio AS price, categoria AS category, metal, stock, imagen AS image FROM productos'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre AS name, descripcion AS description, precio AS price, categoria AS category, metal, stock, imagen AS image FROM productos WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

// Registrar usuario
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ errors: { name: 'El nombre debe tener al menos 3 caracteres' } });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ errors: { email: 'Por favor ingresa un email válido' } });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ errors: { password: 'La contraseña debe tener al menos 6 caracteres' } });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ errors: { email: 'Este email ya está registrado' } });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashed]
    );

    const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase().trim() };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ errors: { email: 'Por favor ingresa tu email' } });
  if (!password) return res.status(400).json({ errors: { password: 'Por favor ingresa tu contraseña' } });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return res.status(400).json({ errors: { email: 'Email no registrado' } });
    }

    const usuario = rows[0];
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      return res.status(400).json({ errors: { password: 'Contraseña incorrecta' } });
    }

    const user = { id: usuario.id, name: usuario.nombre, email: usuario.email };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

// Login admin
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ errors: { email: 'Por favor ingresa tu email' } });
  if (!password) return res.status(400).json({ errors: { password: 'Por favor ingresa tu contraseña' } });

  try {
    const [rows] = await pool.query('SELECT * FROM administradores WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return res.status(400).json({ errors: { email: 'Email de admin no encontrado' } });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(400).json({ errors: { password: 'Contraseña incorrecta' } });
    }

    const user = { id: admin.id, name: admin.nombre, email: admin.email };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Crear producto (solo admin)
app.post('/api/admin/products', verifyToken, verifyAdmin, async (req, res) => {
  const { nombre, descripcion, precio, categoria, metal, stock, imagen } = req.body;

  if (!nombre || !precio || !stock) {
    return res.status(400).json({ error: 'Nombre, precio y stock son requeridos' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria, metal, stock, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion || '', precio, categoria, metal, stock, imagen || '']
    );

    res.json({ success: true, message: 'Producto creado', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto (solo admin)
app.put('/api/admin/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { nombre, descripcion, precio, categoria, metal, stock, imagen } = req.body;
  const { id } = req.params;

  if (!nombre || !precio) {
    return res.status(400).json({ error: 'Nombre y precio son requeridos' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, metal = ?, stock = ?, imagen = ? WHERE id = ?',
      [nombre, descripcion || '', precio, categoria, metal, stock || 0, imagen || '', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto (solo admin)
app.delete('/api/admin/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ============================================
// RUTAS DE IMÁGENES DE PRODUCTOS
// ============================================

// Obtener imágenes de un producto
app.get('/api/products/:id/images', async (req, res) => {
  const { id } = req.params;

  try {
    const [images] = await pool.query(
      'SELECT id, url, orden FROM producto_imagenes WHERE producto_id = ? ORDER BY orden ASC',
      [id]
    );
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

// Subir imagen a producto (solo admin)
app.post('/api/admin/products/:id/upload', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó archivo' });
  }

  try {
    // Validar que el producto existe
    const [product] = await pool.query('SELECT id FROM productos WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Generar nombre único para la imagen
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Optimizar y guardar imagen con sharp
    await sharp(req.file.buffer)
      .webp({ quality: 80 })
      .resize(800, 800, { fit: 'cover' })
      .toFile(filepath);

    // Obtener orden máxima actual
    const [maxOrder] = await pool.query(
      'SELECT MAX(orden) as maxOrd FROM producto_imagenes WHERE producto_id = ?',
      [id]
    );
    const nextOrder = (maxOrder[0].maxOrd || 0) + 1;

    // Guardar ruta en BD
    const imageUrl = `assets/img/products/${filename}`;
    const [result] = await pool.query(
      'INSERT INTO producto_imagenes (producto_id, url, orden) VALUES (?, ?, ?)',
      [id, imageUrl, nextOrder]
    );

    res.json({
      success: true,
      imageId: result.insertId,
      url: imageUrl,
      orden: nextOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// Eliminar imagen de producto (solo admin)
app.delete('/api/admin/products/:id/images/:imageId', verifyToken, verifyAdmin, async (req, res) => {
  const { id, imageId } = req.params;

  try {
    // Obtener la imagen
    const [images] = await pool.query(
      'SELECT url FROM producto_imagenes WHERE id = ? AND producto_id = ?',
      [imageId, id]
    );

    if (images.length === 0) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    // Eliminar archivo del sistema
    const filepath = path.join(__dirname, '../', images[0].url);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Eliminar de BD
    await pool.query('DELETE FROM producto_imagenes WHERE id = ?', [imageId]);

    res.json({ success: true, message: 'Imagen eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

// Reordenar imágenes (solo admin)
app.put('/api/admin/products/:id/images/reorder', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }

  try {
    for (let i = 0; i < images.length; i++) {
      await pool.query(
        'UPDATE producto_imagenes SET orden = ? WHERE id = ? AND producto_id = ?',
        [i, images[i], id]
      );
    }

    res.json({ success: true, message: 'Orden actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reordenar' });
  }
});

// ============================================
// RUTAS DE PEDIDOS
// ============================================

// Crear pedido
app.post('/api/orders', async (req, res) => {
  const { address, items } = req.body;
  if (!address || !items || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  if (token) {
    try { userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch {}
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO pedidos (usuario_id, nombre_destinatario, calle, ciudad, region, codigo_postal, telefono, total) VALUES (?,?,?,?,?,?,?,?)',
      [userId, address.nombre_destinatario, address.calle, address.ciudad, address.region || '', address.codigo_postal || '', address.telefono || '', total]
    );
    const pedidoId = result.insertId;
    const itemValues = items.map(i => [pedidoId, i.id, i.name, i.price, i.qty]);
    await conn.query('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES ?', [itemValues]);
    await conn.commit();
    res.json({ success: true, orderId: pedidoId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al crear pedido' });
  } finally {
    conn.release();
  }
});

// Historial de pedidos del usuario
app.get('/api/user/orders', verifyToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT id, total, estado, creado_en FROM pedidos WHERE usuario_id = ? ORDER BY creado_en DESC',
      [req.user.id]
    );
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Detalle de un pedido
app.get('/api/user/orders/:id', verifyToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const [items] = await pool.query(
      'SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?',
      [req.params.id]
    );
    res.json({ ...orders[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
});

// Admin: todos los pedidos
app.get('/api/admin/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT p.id, p.nombre_destinatario, p.ciudad, p.total, p.estado, p.creado_en,
              u.nombre AS usuario_nombre, u.email AS usuario_email
       FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id
       ORDER BY p.creado_en DESC`
    );
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Admin: cambiar estado de pedido
app.put('/api/admin/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { estado } = req.body;
  const validStates = ['pendiente', 'enviado', 'entregado', 'cancelado'];
  if (!validStates.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// ============================================
// RUTAS DE CARRITO (persistencia)
// ============================================

// Obtener carrito del usuario
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.nombre AS name, p.precio AS price, p.imagen AS image, ci.cantidad AS qty
       FROM carrito_items ci
       JOIN productos p ON p.id = ci.producto_id
       WHERE ci.usuario_id = ?
       ORDER BY ci.agregado_en ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// Sincronizar carrito completo (reemplaza todo)
app.post('/api/cart/sync', verifyToken, async (req, res) => {
  const { items } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.user.id]);
    if (Array.isArray(items) && items.length > 0) {
      const values = items.map(i => [req.user.id, i.producto_id, i.cantidad]);
      await conn.query(
        'INSERT INTO carrito_items (usuario_id, producto_id, cantidad) VALUES ?',
        [values]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al sincronizar carrito' });
  } finally {
    conn.release();
  }
});

// Vaciar carrito
app.delete('/api/cart', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

// ============================================
// RUTAS DE PERFIL
// ============================================

app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre AS name, email FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener perfil' }); }
});

app.put('/api/user/profile', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  if (!name || name.trim().length < 3) return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  try {
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email.toLowerCase().trim(), req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Ese email ya está en uso' });
    await pool.query('UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?', [name.trim(), email.toLowerCase().trim(), req.user.id]);
    res.json({ success: true, user: { id: req.user.id, name: name.trim(), email: email.toLowerCase().trim() } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar perfil' }); }
});

app.put('/api/user/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan datos' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  try {
    const [rows] = await pool.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al cambiar contraseña' }); }
});

// ============================================
// RUTAS DE DIRECCIONES
// ============================================

// Obtener direcciones del usuario
app.get('/api/user/addresses', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre_destinatario, calle, ciudad, region, codigo_postal, telefono FROM direcciones WHERE usuario_id = ? ORDER BY creado_en DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
});

// Guardar nueva dirección
app.post('/api/user/addresses', verifyToken, async (req, res) => {
  const { nombre_destinatario, calle, ciudad, region, codigo_postal, telefono } = req.body;
  if (!nombre_destinatario || !calle || !ciudad) {
    return res.status(400).json({ error: 'Nombre, calle y ciudad son requeridos' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO direcciones (usuario_id, nombre_destinatario, calle, ciudad, region, codigo_postal, telefono) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, nombre_destinatario, calle, ciudad, region || '', codigo_postal || '', telefono || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar dirección' });
  }
});

// Eliminar dirección
app.delete('/api/user/addresses/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM direcciones WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Dirección no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar dirección' });
  }
});

// ============================================
// SSR - PÁGINA DE PRODUCTO
// ============================================

app.get('/producto/:id', async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT id, nombre AS name, descripcion AS description, precio AS price, categoria AS category, metal AS metal, stock, imagen AS image FROM productos WHERE id = ?',
      [req.params.id]
    );
    if (products.length === 0) return res.status(404).sendFile(path.join(__dirname, '../404.html'));

    const product = products[0];

    const [images] = await pool.query(
      'SELECT url FROM producto_imagenes WHERE producto_id = ? ORDER BY orden ASC',
      [product.id]
    );
    const imageUrls = images.length > 0 ? images.map(i => i.url) : (product.image ? [product.image] : []);

    res.render('producto', { product, imageUrls, siteUrl: SITE_URL });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el producto');
  }
});

// ============================================
// SITEMAP.XML
// ============================================

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT id, nombre AS name FROM productos');

    const urls = [
      `<url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...products.map(p =>
        `<url><loc>${SITE_URL}/producto/${p.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      )
    ].join('\n  ');

    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`);
  } catch (err) {
    res.status(500).send('Error al generar sitemap');
  }
});

// ============================================
// ROBOTS.TXT
// ============================================

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
