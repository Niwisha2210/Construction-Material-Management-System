require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'buildstock',
  dateStrings: true
});

// wrap async handlers so SQL errors reach the UI as readable messages
const h = fn => (req, res) =>
  fn(req, res).catch(e => res.status(400).json({ error: e.sqlMessage || e.message }));
const val = v => (v === '' || v === undefined ? null : v);

// ---------- generic CRUD: materials, suppliers, employees, sites ----------
const tables = {
  materials: { t: 'Materials', pk: 'material_id', f: ['name', 'category', 'unit', 'unit_price', 'reorder_level'] },
  suppliers: { t: 'Suppliers', pk: 'supplier_id', f: ['name', 'phone', 'email', 'city'] },
  employees: { t: 'Employees', pk: 'emp_id', f: ['name', 'role', 'phone'] },
  sites: {
    t: 'Sites', pk: 'site_id', f: ['site_name', 'location', 'status', 'manager_id'],
    sel: 'SELECT s.*, e.name AS manager FROM Sites s LEFT JOIN Employees e ON e.emp_id = s.manager_id ORDER BY s.site_id DESC'
  }
};

for (const [k, { t, pk, f, sel }] of Object.entries(tables)) {
  app.get(`/api/${k}`, h(async (req, res) => {
    const [rows] = await db.query(sel || `SELECT * FROM ${t} ORDER BY ${pk} DESC`);
    res.json(rows);
  }));
  app.post(`/api/${k}`, h(async (req, res) => {
    await db.query(`INSERT INTO ${t} (${f.join(',')}) VALUES (?)`, [f.map(x => val(req.body[x]))]);
    res.json({ ok: true });
  }));
  app.put(`/api/${k}/:id`, h(async (req, res) => {
    await db.query(`UPDATE ${t} SET ${f.map(x => x + '=?').join(',')} WHERE ${pk}=?`,
      [...f.map(x => val(req.body[x])), req.params.id]);
    res.json({ ok: true });
  }));
  app.delete(`/api/${k}/:id`, h(async (req, res) => {
    await db.query(`DELETE FROM ${t} WHERE ${pk}=?`, [req.params.id]);
    res.json({ ok: true });
  }));
}

// ---------- dashboard, inventory ----------
app.get('/api/dashboard', h(async (req, res) => {
  const [[d]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM Materials) AS materials,
    (SELECT COUNT(*) FROM Suppliers) AS suppliers,
    (SELECT COUNT(*) FROM Sites WHERE status = 'Active') AS sites,
    (SELECT COUNT(*) FROM v_inventory WHERE quantity <= reorder_level) AS lowStock`);
  res.json(d);
}));

app.get('/api/inventory', h(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM v_inventory ORDER BY name');
  res.json(rows);
}));

// ---------- purchases (transaction: header + items commit together) ----------
app.get('/api/purchases', h(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM v_purchase_summary ORDER BY purchase_id DESC');
  res.json(rows);
}));

app.post('/api/purchases', h(async (req, res) => {
  const { supplier_id, emp_id, items } = req.body;
  if (!items || !items.length) throw new Error('Add at least one item');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [p] = await c.query('INSERT INTO Purchases (supplier_id, emp_id) VALUES (?,?)', [supplier_id, emp_id]);
    for (const i of items) {
      await c.query(
        'INSERT INTO Purchase_Items (purchase_id, material_id, quantity, unit_price) VALUES (?,?,?,?)',
        [p.insertId, i.material_id, i.quantity, i.unit_price]);
    }
    await c.commit();
    res.json({ id: p.insertId });
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}));

// ---------- material usage (stored procedure + triggers) ----------
app.get('/api/usage', h(async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.usage_id, u.usage_date, s.site_name, m.name AS material, u.quantity, e.name AS employee
    FROM Material_Usage u
    JOIN Sites s ON s.site_id = u.site_id
    JOIN Materials m ON m.material_id = u.material_id
    JOIN Employees e ON e.emp_id = u.emp_id
    ORDER BY u.usage_id DESC`);
  res.json(rows);
}));

app.post('/api/usage', h(async (req, res) => {
  const { site_id, material_id, emp_id, quantity } = req.body;
  await db.query('CALL sp_record_usage(?,?,?,?)', [site_id, material_id, emp_id, quantity]);
  res.json({ ok: true });
}));

// ---------- reports ----------
app.get('/api/reports', h(async (req, res) => {
  const [bySupplier] = await db.query(`
    SELECT s.name AS supplier, COUNT(p.purchase_id) AS orders, COALESCE(SUM(p.total_amount),0) AS total
    FROM Suppliers s LEFT JOIN Purchases p ON p.supplier_id = s.supplier_id
    GROUP BY s.supplier_id, s.name ORDER BY total DESC`);
  const [bySite] = await db.query('SELECT * FROM v_site_usage ORDER BY site_name, cost DESC');
  res.json({ bySupplier, bySite });
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`BuildStock running at http://localhost:${port}`));