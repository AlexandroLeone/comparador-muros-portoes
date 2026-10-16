const STORAGE_KEY = 'muro-comparador-v1';

const seedOptions = [
  {
    id: 'modelo-a',
    name: 'Opção A — Plano contínuo',
    material: 'Reboco com pintura fosca',
    colorName: 'Areia clara',
    colorHex: '#c9bda8',
    gateType: 'Deslizante',
    privacyLevel: 'Alto',
    notes: 'Composição simples, fácil manutenção e leitura horizontal limpa.',
    image: '',
    art: 'variant-a',
    favorite: false
  },
  {
    id: 'modelo-b',
    name: 'Opção B — Madeira e concreto',
    material: 'Concreto + ripado amadeirado',
    colorName: 'Cinza e madeira',
    colorHex: '#7c6452',
    gateType: 'Basculante',
    privacyLevel: 'Médio',
    notes: 'Contraste de materiais e entrada social destacada por recuo.',
    image: '',
    art: 'variant-b',
    favorite: false
  },
  {
    id: 'modelo-c',
    name: 'Opção C — Estrutura vazada',
    material: 'Alvenaria + metalon',
    colorName: 'Grafite',
    colorHex: '#293b3c',
    gateType: 'Pedestre + veículo',
    privacyLevel: 'Baixo',
    notes: 'Maior ventilação e permeabilidade visual, com detalhe ripado lateral.',
    image: '',
    art: 'variant-c',
    favorite: false
  }
];

let state = loadState();
let pendingImage = '';
let confirmAction = null;

const $ = (selector) => document.querySelector(selector);
const cardsGrid = $('#cardsGrid');
const optionDialog = $('#optionDialog');
const optionForm = $('#optionForm');
const compareTable = $('#compareTable');
const compareArea = $('#compareArea');
const compareEmpty = $('#compareEmpty');
const toast = $('#toast');

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.options)) {
      return { options: parsed.options, compareIds: Array.isArray(parsed.compareIds) ? parsed.compareIds.slice(0, 3) : [] };
    }
  } catch (_) {}
  return { options: structuredClone(seedOptions), compareIds: [] };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    showToast('A imagem é grande demais para salvar neste navegador. Tente uma imagem menor.');
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function facadeMarkup(option, label = true) {
  if (option.image) return `<img src="${option.image}" alt="Imagem de ${escapeHtml(option.name)}">`;
  return `<div class="facade-art ${escapeHtml(option.art || 'variant-a')}" style="--wall:${escapeHtml(option.colorHex)}">
    ${label ? '<span class="visual-label">IMAGEM DEMONSTRATIVA</span>' : ''}
    <div class="wall-shape"></div>
  </div>`;
}

function cardMarkup(option) {
  const selected = state.compareIds.includes(option.id);
  return `<article class="card ${option.favorite ? 'is-favorite' : ''}" data-id="${escapeHtml(option.id)}">
    <div class="card-visual">
      ${facadeMarkup(option)}
      <button class="favorite-btn" data-action="favorite" aria-label="${option.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}" aria-pressed="${option.favorite}">${option.favorite ? '★' : '☆'}</button>
    </div>
    <div class="card-body">
      <p class="card-kicker">${option.favorite ? '★ FAVORITA' : 'ALTERNATIVA'}</p>
      <h3>${escapeHtml(option.name)}</h3>
      <dl class="specs">
        <div class="spec"><dt>Material</dt><dd>${escapeHtml(option.material)}</dd></div>
        <div class="spec"><dt>Cor</dt><dd><i class="color-dot" style="background:${escapeHtml(option.colorHex)}"></i>${escapeHtml(option.colorName)}</dd></div>
        <div class="spec"><dt>Portão</dt><dd>${escapeHtml(option.gateType)}</dd></div>
        <div class="spec"><dt>Privacidade</dt><dd>${escapeHtml(option.privacyLevel)}</dd></div>
      </dl>
      <p class="notes">${escapeHtml(option.notes || 'Sem observações.')}</p>
      <div class="card-actions">
        <button class="btn small ${selected ? 'selected' : 'btn-secondary'}" data-action="compare">${selected ? '✓ Na comparação' : 'Comparar'}</button>
        <button class="icon-btn" data-action="edit" title="Editar alternativa" aria-label="Editar alternativa">✎</button>
        <button class="icon-btn" data-action="delete" title="Excluir alternativa" aria-label="Excluir alternativa">⌫</button>
      </div>
    </div>
  </article>`;
}

function getVisibleOptions() {
  const query = $('#searchInput').value.trim().toLocaleLowerCase('pt-BR');
  const gate = $('#gateFilter').value;
  return state.options.filter(option => {
    const haystack = [option.name, option.material, option.colorName, option.gateType, option.notes].join(' ').toLocaleLowerCase('pt-BR');
    return (!query || haystack.includes(query)) && (!gate || option.gateType === gate);
  });
}

function render() {
  const visible = getVisibleOptions();
  cardsGrid.innerHTML = visible.map(cardMarkup).join('');
  $('#emptyState').hidden = visible.length > 0;
  cardsGrid.hidden = visible.length === 0;
  $('#optionCount').textContent = state.options.length;
  $('#compareCount').textContent = state.compareIds.length;
  $('#favoriteCount').textContent = state.options.some(o => o.favorite) ? '1' : '0';
  updateGateFilter();
  renderComparison();
}

function updateGateFilter() {
  const filter = $('#gateFilter');
  const current = filter.value;
  const gates = [...new Set(state.options.map(o => o.gateType))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  filter.innerHTML = '<option value="">Todos os portões</option>' + gates.map(g => `<option ${g === current ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');
}

function renderComparison() {
  const selected = state.compareIds.map(id => state.options.find(o => o.id === id)).filter(Boolean);
  const ready = selected.length >= 2;
  compareArea.hidden = !ready;
  compareEmpty.hidden = ready;
  $('#clearCompareBtn').hidden = selected.length === 0;
  $('#compareHint').textContent = ready ? `${selected.length} alternativas selecionadas. A comparação é atualizada automaticamente.` : 'Selecione pelo menos duas alternativas acima.';
  if (!ready) return;

  const rows = [
    ['Imagem', o => `<div class="compare-thumb">${facadeMarkup(o, false)}</div>`],
    ['Material', o => escapeHtml(o.material)],
    ['Cor', o => `<div class="compare-swatch" style="background:${escapeHtml(o.colorHex)}" title="${escapeHtml(o.colorName)}"></div><small>${escapeHtml(o.colorName)}</small>`],
    ['Tipo de portão', o => escapeHtml(o.gateType)],
    ['Privacidade', o => escapeHtml(o.privacyLevel)],
    ['Observações', o => escapeHtml(o.notes || '—')],
    ['Decisão', o => o.favorite ? '<strong>★ Favorita</strong>' : '<span>Em análise</span>']
  ];
  compareTable.innerHTML = `<thead><tr><th>Critério</th>${selected.map(o => `<th>${escapeHtml(o.name)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label, cell]) => `<tr><td>${label}</td>${selected.map(o => `<td>${cell(o)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function openForm(option = null) {
  optionForm.reset();
  pendingImage = option?.image || '';
  $('#optionId').value = option?.id || '';
  $('#formMode').textContent = option ? 'EDITAR ALTERNATIVA' : 'NOVA ALTERNATIVA';
  $('#formTitle').textContent = option ? 'Atualizar proposta' : 'Cadastrar proposta';
  $('#name').value = option?.name || '';
  $('#material').value = option?.material || '';
  $('#colorName').value = option?.colorName || '';
  $('#colorHex').value = option?.colorHex || '#747a78';
  $('#gateType').value = option?.gateType || '';
  $('#privacyLevel').value = option?.privacyLevel || 'Médio';
  $('#notes').value = option?.notes || '';
  $('#fileName').textContent = option?.image ? 'Imagem atual mantida até escolher outra.' : '';
  optionDialog.showModal();
  setTimeout(() => $('#name').focus(), 80);
}

function closeForm() {
  optionDialog.close();
  pendingImage = '';
}

function askConfirmation(title, message, action) {
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  confirmAction = action;
  $('#confirmDialog').showModal();
}

cardsGrid.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  const card = event.target.closest('.card');
  if (!button || !card) return;
  const option = state.options.find(o => o.id === card.dataset.id);
  if (!option) return;

  if (button.dataset.action === 'favorite') {
    state.options.forEach(o => { o.favorite = o.id === option.id ? !option.favorite : false; });
    saveState(); render();
    showToast(option.favorite ? 'Alternativa marcada como favorita.' : 'Favorito removido.');
  }

  if (button.dataset.action === 'compare') {
    const index = state.compareIds.indexOf(option.id);
    if (index >= 0) state.compareIds.splice(index, 1);
    else if (state.compareIds.length < 3) state.compareIds.push(option.id);
    else { showToast('Você pode comparar até três alternativas por vez.'); return; }
    saveState(); render();
    if (state.compareIds.length >= 2) setTimeout(() => $('#comparisonSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  if (button.dataset.action === 'edit') openForm(option);

  if (button.dataset.action === 'delete') {
    askConfirmation('Excluir alternativa?', `“${option.name}” será removida deste navegador.`, () => {
      state.options = state.options.filter(o => o.id !== option.id);
      state.compareIds = state.compareIds.filter(id => id !== option.id);
      saveState(); render(); showToast('Alternativa excluída.');
    });
  }
});

optionForm.addEventListener('submit', event => {
  event.preventDefault();
  const id = $('#optionId').value;
  const existing = state.options.find(o => o.id === id);
  const payload = {
    id: id || `opcao-${Date.now()}`,
    name: $('#name').value.trim(),
    material: $('#material').value.trim(),
    colorName: $('#colorName').value.trim(),
    colorHex: $('#colorHex').value,
    gateType: $('#gateType').value,
    privacyLevel: $('#privacyLevel').value,
    notes: $('#notes').value.trim(),
    image: pendingImage,
    art: existing?.art || ['variant-a', 'variant-b', 'variant-c'][state.options.length % 3],
    favorite: existing?.favorite || false
  };
  if (existing) Object.assign(existing, payload);
  else state.options.unshift(payload);
  saveState(); render(); closeForm();
  showToast(existing ? 'Alternativa atualizada.' : 'Alternativa adicionada.');
});

$('#image').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { showToast('Escolha uma imagem de até 3 MB.'); event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => { pendingImage = reader.result; $('#fileName').textContent = file.name; };
  reader.readAsDataURL(file);
});

$('#openFormBtn').addEventListener('click', () => openForm());
$('#closeDialogBtn').addEventListener('click', closeForm);
$('#cancelBtn').addEventListener('click', closeForm);
$('#searchInput').addEventListener('input', render);
$('#gateFilter').addEventListener('change', render);
$('#clearCompareBtn').addEventListener('click', () => { state.compareIds = []; saveState(); render(); showToast('Seleção de comparação limpa.'); });
$('#clearDataBtn').addEventListener('click', () => {
  askConfirmation('Restaurar exemplos?', 'Suas alternativas deste navegador serão substituídas pelos três exemplos neutros.', () => {
    state = { options: structuredClone(seedOptions), compareIds: [] };
    saveState(); render(); showToast('Exemplos restaurados.');
  });
});
$('#confirmDialog').addEventListener('close', event => {
  if (event.target.returnValue === 'confirm' && confirmAction) confirmAction();
  confirmAction = null;
});
optionDialog.addEventListener('click', event => { if (event.target === optionDialog) closeForm(); });

render();
