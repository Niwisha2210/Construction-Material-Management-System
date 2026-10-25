const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(url, method = 'GET', body) {
  const r = await fetch('/api/' + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (bad ? ' bad' : '');
  setTimeout(() => (t.className = ''), 2800);
}

const opts = (rows, v, l) => rows.map(r => `<option value="${r[v]}">${esc(r[l])}</option>`).join('');
const money = v => '₹' + Number(v).toLocaleString('en-IN');
const badge = s => `<span class="badge ${s === 'In stock' ? 'ok' : s === 'Low stock' ? 'warn' : 'bad'}">${s}</span>`;

// cols: [key, label, optional formatter]
function tbl(cols, rows, extra) {
  if (!rows.length) return '<p class="empty">No records yet.</p>';
  const head = cols.map(c => `<th>${c[1]}</th>`).join('') + (extra ? '<th></th>' : '');
  const body = rows.map(r =>
    '<tr>' + cols.map(c => `<td>${c[2] ? c[2](r[c[0]]) : esc(r[c[0]])}</td>`).join('') +
    (extra ? `<td>${extra(r)}</td>` : '') + '</tr>').join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

const invCols = [['name', 'Material'], ['category', 'Category'], ['quantity', 'Stock'], ['unit', 'Unit'],
  ['reorder_level', 'Reorder level'], ['status', 'Status', badge]];

// ---------- generic CRUD page ----------
const crudCfg = {
  materials: { title: 'Materials', pk: 'material_id', f: [['name', 'Name'], ['category', 'Category'], ['unit', 'Unit'], ['unit_price', 'Unit price (₹)', 'number'], ['reorder_level', 'Reorder level', 'number']] },
  suppliers: { title: 'Suppliers', pk: 'supplier_id', f: [['name', 'Name'], ['phone', 'Phone'], ['email', 'Email', 'email'], ['city', 'City']] },
  employees: { title: 'Employees', pk: 'emp_id', f: [['name', 'Name'], ['role', 'Role'], ['phone', 'Phone']] },
  sites: { title: 'Construction sites', pk: 'site_id', f: [['site_name', 'Site name'], ['location', 'Location'], ['status', 'Status', 'status'], ['manager_id', 'Manager', 'emp']] }
};

async function crud(key) {
  const c = crudCfg[key];
  const emps = key === 'sites' ? await api('employees') : [];
  const rows = await api(key);
  let editId = null;
  const cols = [[c.pk, 'ID'], ...c.f.map(([n, l]) => [n === 'manager_id' ? 'manager' : n, l])];

  const input = ([n, l, t = 'text']) => {
    if (t === 'status') return `<label>${l}<select name="${n}"><option>Active</option><option>On Hold</option><option>Completed</option></select></label>`;
    if (t === 'emp') return `<label>${l}<select name="${n}"><option value="">None</option>${opts(emps, 'emp_id', 'name')}</select></label>`;
    return `<label>${l}<input name="${n}" type="${t}" step="any" ${n.includes('name') || t === 'number' ? 'required' : ''}></label>`;
  };

  $('#view').innerHTML = `<h2>${c.title}</h2>
    <form id="f" class="card grid">${c.f.map(input).join('')}
      <button class="primary">Save</button><button type="button" id="cancel" hidden>Cancel edit</button></form>
    <input id="q" class="search" placeholder="Search ${c.title.toLowerCase()}">
    <div class="card" id="t"></div>`;

  const form = $('#f');
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    const list = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));
    $('#t').innerHTML = tbl(cols, list, r =>
      `<button data-e="${r[c.pk]}">Edit</button> <button data-d="${r[c.pk]}" class="danger">Delete</button>`);
  };

  $('#t').onclick = async e => {
    const { e: eid, d: did } = e.target.dataset;
    if (did) {
      if (!confirm('Delete this record?')) return;
      try { await api(`${key}/${did}`, 'DELETE'); toast('Deleted'); crud(key); }
      catch (x) { toast(x.message, true); }
    } else if (eid) {
      const r = rows.find(r => r[c.pk] == eid);
      editId = eid;
      c.f.forEach(([n]) => (form.elements[n].value = r[n] ?? ''));
      $('#cancel').hidden = false;
      scrollTo(0, 0);
    }
  };
  $('#cancel').onclick = () => crud(key);
  $('#q').oninput = draw;
  form.onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    try {
      if (editId) await api(`${key}/${editId}`, 'PUT', body); else await api(key, 'POST', body);
      toast('Saved'); crud(key);
    } catch (x) { toast(x.message, true); }
  };
  draw();
}

// ---------- pages ----------
const pages = {
  async dashboard() {
    const [d, inv] = await Promise.all([api('dashboard'), api('inventory')]);
    const low = inv.filter(i => i.status !== 'In stock');
    const stats = [['Total materials', d.materials], ['Suppliers', d.suppliers], ['Active sites', d.sites], ['Low stock items', d.lowStock, 'alert']];
    $('#view').innerHTML = `<h2>Dashboard overview</h2>
      <div class="stats">${stats.map(([l, v, a]) => `<div class="card stat ${a || ''}"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
      <h3>Low stock alerts</h3><div class="card">${low.length ? tbl(invCols, low) : '<p class="empty">All materials are above their reorder level.</p>'}</div>`;
  },

  materials: () => crud('materials'),
  suppliers: () => crud('suppliers'),
  employees: () => crud('employees'),
  sites: () => crud('sites'),

  async inventory() {
    const inv = await api('inventory');
    const total = inv.reduce((s, i) => s + Number(i.stock_value), 0);
    $('#view').innerHTML = `<h2>Inventory</h2><p>Total stock value: <b>${money(total)}</b></p>
      <div class="card">${tbl([...invCols, ['stock_value', 'Stock value', money]], inv)}</div>`;
  },

  async purchases() {
    const [sup, emp, mat, list] = await Promise.all([api('suppliers'), api('employees'), api('materials'), api('purchases')]);
    const row = () => `<div class="item grid">
      <select name="material_id">${opts(mat, 'material_id', 'name')}</select>
      <input name="quantity" type="number" min="1" placeholder="Quantity" required>
      <input name="unit_price" type="number" step="any" min="0" placeholder="Unit price" required>
      <button type="button" class="danger rm">Remove</button></div>`;
    $('#view').innerHTML = `<h2>Purchase entry</h2>
      <form id="f" class="card">
        <div class="grid">
          <label>Supplier<select name="supplier_id">${opts(sup, 'supplier_id', 'name')}</select></label>
          <label>Purchased by<select name="emp_id">${opts(emp, 'emp_id', 'name')}</select></label>
        </div>
        <div id="items">${row()}</div><br>
        <button type="button" id="add">Add item</button> <button class="primary">Save purchase</button>
      </form>
      <h3>Purchase history</h3>
      <div class="card">${tbl([['purchase_id', 'ID'], ['purchase_date', 'Date'], ['supplier', 'Supplier'], ['employee', 'Purchased by'], ['total_amount', 'Total', money]], list)}</div>`;

    const items = $('#items');
    const fill = d => { const m = mat.find(x => x.material_id == d.querySelector('select').value); if (m) d.querySelector('[name=unit_price]').value = m.unit_price; };
    fill(items.firstElementChild);
    items.onchange = e => { if (e.target.name === 'material_id') fill(e.target.closest('.item')); };
    items.onclick = e => { if (e.target.classList.contains('rm') && items.children.length > 1) e.target.closest('.item').remove(); };
    $('#add').onclick = () => { items.insertAdjacentHTML('beforeend', row()); fill(items.lastElementChild); };
    $('#f').onsubmit = async e => {
      e.preventDefault();
      const f = e.target.elements;
      const body = {
        supplier_id: f.supplier_id.value, emp_id: f.emp_id.value,
        items: [...items.children].map(d => ({
          material_id: d.querySelector('[name=material_id]').value,
          quantity: d.querySelector('[name=quantity]').value,
          unit_price: d.querySelector('[name=unit_price]').value
        }))
      };
      try { await api('purchases', 'POST', body); toast('Purchase saved, stock updated'); pages.purchases(); }
      catch (x) { toast(x.message, true); }
    };
  },

  async usage() {
    const [sites, mat, emp, list] = await Promise.all([api('sites'), api('materials'), api('employees'), api('usage')]);
    $('#view').innerHTML = `<h2>Material usage</h2>
      <form id="f" class="card grid">
        <label>Site<select name="site_id">${opts(sites, 'site_id', 'site_name')}</select></label>
        <label>Material<select name="material_id">${opts(mat, 'material_id', 'name')}</select></label>
        <label>Issued by<select name="emp_id">${opts(emp, 'emp_id', 'name')}</select></label>
        <label>Quantity<input name="quantity" type="number" min="1" required></label>
        <button class="primary">Issue material</button>
      </form>
      <div class="card">${tbl([['usage_id', 'ID'], ['usage_date', 'Date'], ['site_name', 'Site'], ['material', 'Material'], ['quantity', 'Quantity'], ['employee', 'Issued by']], list)}</div>`;
    $('#f').onsubmit = async e => {
      e.preventDefault();
      try { await api('usage', 'POST', Object.fromEntries(new FormData(e.target))); toast('Material issued, stock reduced'); pages.usage(); }
      catch (x) { toast(x.message, true); }
    };
  },

  async reports() {
    const r = await api('reports');
    $('#view').innerHTML = `<h2>Reports</h2>
      <h3>Purchase cost by supplier</h3>
      <div class="card">${tbl([['supplier', 'Supplier'], ['orders', 'Orders'], ['total', 'Total spent', money]], r.bySupplier)}</div>
      <h3>Material cost by site</h3>
      <div class="card">${tbl([['site_name', 'Site'], ['material', 'Material'], ['total_used', 'Quantity used'], ['cost', 'Cost', money]], r.bySite)}</div>`;
  }
};

async function show(p) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  try { await pages[p](); }
  catch (e) { $('#view').innerHTML = `<div class="card">Could not load this page: ${esc(e.message)}. Check that MySQL is running and .env is correct.</div>`; }
}

document.querySelector('nav').onclick = e => { if (e.target.dataset.page) show(e.target.dataset.page); };
show('dashboard');