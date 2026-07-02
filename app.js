const state = { docs: [], items: [] };
const $ = (id) => document.getElementById(id);

async function loadData() {
  const [docsRes, itemsRes] = await Promise.all([
    fetch('data/documents.json').catch(() => null),
    fetch('data/work_programme_items.json').catch(() => null)
  ]);
  state.docs = docsRes && docsRes.ok ? await docsRes.json() : [];
  state.items = itemsRes && itemsRes.ok ? await itemsRes.json() : [];
  populateFilters();
  render();
}

function populateFilters() {
  const committees = [...new Set([...state.docs, ...state.items].map(x => x.committee).filter(Boolean))].sort();
  $('committeeFilter').innerHTML = '<option value="">All committees</option>' + committees.map(c => `<option>${escapeHtml(c)}</option>`).join('');
  const types = [...new Set(state.docs.map(x => x.document_type).filter(Boolean))].sort();
  $('typeFilter').innerHTML = '<option value="">All document types</option>' + types.map(t => `<option>${escapeHtml(t)}</option>`).join('');
}

function filters(row) {
  const q = $('search').value.toLowerCase().trim();
  const c = $('committeeFilter').value;
  const t = $('typeFilter').value;
  const text = Object.values(row).join(' ').toLowerCase();
  return (!q || text.includes(q)) && (!c || row.committee === c) && (!t || row.document_type === t);
}

function render() {
  const docs = state.docs.filter(filters);
  const items = state.items.filter(filters);
  const repeated = items.filter(x => Number(x.times_seen || 0) > 1).length;
  const undated = items.filter(x => !x.assigned_date).length;
  $('summaryCards').innerHTML = [
    ['Committees', new Set(state.docs.map(d => d.committee)).size],
    ['Documents', state.docs.length],
    ['Work programme items', state.items.length],
    ['Repeated items', repeated],
    ['No assigned date', undated]
  ].map(([label, value]) => `<article class="card"><b>${value}</b><span>${label}</span></article>`).join('');

  renderTable('itemsTable', ['committee','item','assigned_date','meeting_date','times_seen','source_document'], items, (r,k) => k === 'source_document' && r.source_url ? `<a href="${r.source_url}">${escapeHtml(r[k]||'source')}</a>` : escapeHtml(r[k] ?? ''));
  renderTable('docsTable', ['committee','meeting_date','meeting_title','document_type','title','local_path'], docs, (r,k) => k === 'local_path' ? `<a href="${r.local_path}">Download</a>` : (k === 'document_type' ? `<span class="badge">${escapeHtml(r[k]||'Other')}</span>` : escapeHtml(r[k] ?? '')));
}

function renderTable(id, columns, rows, cellRenderer) {
  const table = $(id);
  table.innerHTML = `<thead><tr>${columns.map(c => `<th>${human(c)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${columns.map(c => `<td>${cellRenderer(r,c)}</td>`).join('')}</tr>`).join('') +
    (rows.length ? '</tbody>' : `<tr><td colspan="${columns.length}">No records yet. Run the scraper workflow to populate this table.</td></tr></tbody>`);
}
function human(s){ return s.replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase()); }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
['search','committeeFilter','typeFilter'].forEach(id => $(id).addEventListener('input', render));
loadData();
