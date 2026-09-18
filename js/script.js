const ROWS = 19;
const COLS = 15;

const tileTypes = {
  wall:   { char: '1', label: 'Parede' },
  free:   { char: '0', label: 'Espaço livre' },
  dot:    { char: '2', label: 'Ponto' },
  fruit:  { char: '3', label: 'Fruta' },
  pacman: { char: '4', label: 'Pac-Man' },
  empty:  { char: '0', label: 'Espaço vazio' },
  red:    { char: 'R', label: 'Fantasma vermelho' },
  blue:   { char: 'B', label: 'Fantasma azul' },
  yellow: { char: 'Y', label: 'Fantasma amarelo' },
  green:  { char: 'G', label: 'Fantasma verde' }
};

const classByChar = {
  '0': 'free',
  '1': 'wall',
  '2': 'dot',
  '3': 'fruit',
  '4': 'pacman',
  'R': 'red',
  'B': 'blue',
  'Y': 'yellow',
  'G': 'green'
};

const editorGrid = document.querySelector('#editorGrid');
const previewGrid = document.querySelector('#previewGrid');
const palette = document.querySelector('#palette');
const mapCode = document.querySelector('#mapCode');
const activeToolText = document.querySelector('#activeToolText');
const toast = document.querySelector('#toast');
const importCode = document.querySelector('#importCode');
const importMessage = document.querySelector('#importMessage');

let currentType = 'wall';
let isPainting = false;
let toastTimer;

// Estes elementos só podem existir uma vez no mapa.
const uniqueTypes = new Set(['fruit', 'pacman', 'red', 'blue', 'yellow', 'green']);

// Cada posição guarda o tipo visual. "free" e "empty" geram ambos o código 0,
// porque o formato solicitado possui somente um caractere para esses espaços.
let mapState = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => 'free')
);

function buildGrids() {
  const editorFragment = document.createDocumentFragment();
  const previewFragment = document.createDocumentFragment();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const editorCell = createCell(row, col, true);
      const previewCell = createCell(row, col, false);
      editorFragment.appendChild(editorCell);
      previewFragment.appendChild(previewCell);
    }
  }

  editorGrid.appendChild(editorFragment);
  previewGrid.appendChild(previewFragment);
  renderAll();
}

function createCell(row, col, editable) {
  const cell = document.createElement(editable ? 'button' : 'div');
  cell.className = 'cell free';
  cell.dataset.row = row;
  cell.dataset.col = col;

  if (editable) {
    cell.type = 'button';
    cell.setAttribute('aria-label', `Linha ${row + 1}, coluna ${col + 1}`);

    cell.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      isPainting = true;
      paintCell(row, col);
    });

  }

  return cell;
}

window.addEventListener('pointerup', () => { isPainting = false; });
window.addEventListener('pointercancel', () => { isPainting = false; });

editorGrid.addEventListener('pointermove', (event) => {
  if (!isPainting) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.editor-grid .cell');
  if (!target) return;
  paintCell(Number(target.dataset.row), Number(target.dataset.col));
});

function paintCell(row, col) {
  // Pac-Man, fruta e cada fantasma são únicos. Ao posicionar um deles
  // em uma nova célula, a posição anterior volta a ser espaço livre.
  if (uniqueTypes.has(currentType)) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (mapState[r][c] === currentType && (r !== row || c !== col)) {
          mapState[r][c] = 'free';
          renderCell(r, c);
        }
      }
    }
  }

  mapState[row][col] = currentType;
  renderCell(row, col);
  updateCode();
}

function visualClasses(type) {
  if (['red', 'blue', 'yellow', 'green'].includes(type)) return `ghost ${type}`;
  return type;
}

function renderCell(row, col) {
  const index = row * COLS + col;
  const type = mapState[row][col];
  const visual = visualClasses(type);

  [editorGrid.children[index], previewGrid.children[index]].forEach((cell) => {
    cell.className = `cell ${visual}`;
  });
}

function renderAll() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) renderCell(row, col);
  }
  updateCode();
}

function updateCode() {
  const lines = mapState.map(row => row.map(type => tileTypes[type].char).join(''));
  mapCode.textContent = lines.join('\n');
}

palette.addEventListener('click', (event) => {
  const button = event.target.closest('.tile-option');
  if (!button) return;

  currentType = button.dataset.type;
  document.querySelectorAll('.tile-option').forEach(btn => btn.classList.remove('selected'));
  button.classList.add('selected');
  activeToolText.textContent = `Selecionado: ${tileTypes[currentType].label} (${tileTypes[currentType].char})`;
});

document.querySelector('#clearMap').addEventListener('click', () => {
  mapState = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 'free'));
  renderAll();
  showToast('Mapa limpo.');
});

document.querySelector('#fillWalls').addEventListener('click', () => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1) mapState[row][col] = 'wall';
    }
  }
  renderAll();
  showToast('Bordas preenchidas com parede.');
});

document.querySelector('#fillDots').addEventListener('click', () => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (['free', 'dot'].includes(mapState[row][col])) mapState[row][col] = 'dot';
    }
  }
  renderAll();
  showToast('Espaços livres preenchidos com pontos.');
});

document.querySelector('#copyCode').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(mapCode.textContent);
    showToast('Código copiado!');
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(mapCode);
    selection.removeAllRanges();
    selection.addRange(range);
    showToast('Código selecionado. Use Ctrl+C para copiar.');
  }
});

document.querySelector('#downloadCode').addEventListener('click', () => {
  const blob = new Blob([mapCode.textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mapa-pippiman.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Arquivo mapa-pippiman.txt gerado.');
});

document.querySelector('#applyImport').addEventListener('click', () => {
  const raw = importCode.value.trim().replace(/\r/g, '');
  const lines = raw.split('\n').map(line => line.trim());
  const allowed = /^[01234RBYG]{15}$/i;

  if (lines.length !== ROWS || !lines.every(line => allowed.test(line))) {
    importMessage.textContent = 'Código inválido: use 19 linhas com 15 caracteres válidos em cada.';
    importMessage.style.color = '#ff8c9c';
    return;
  }

  const normalizedCode = lines.join('').toUpperCase();
  const uniqueChars = [
    ['3', 'fruta'],
    ['4', 'Pac-Man'],
    ['R', 'fantasma vermelho'],
    ['B', 'fantasma azul'],
    ['Y', 'fantasma amarelo'],
    ['G', 'fantasma verde']
  ];

  const repeated = uniqueChars.find(([char]) => normalizedCode.split(char).length - 1 > 1);
  if (repeated) {
    importMessage.textContent = `Código inválido: só pode existir 1 ${repeated[1]} no mapa.`;
    importMessage.style.color = '#ff8c9c';
    return;
  }

  mapState = lines.map(line => [...line.toUpperCase()].map(char => classByChar[char]));
  renderAll();
  importMessage.textContent = 'Mapa carregado com sucesso.';
  importMessage.style.color = '#72e69a';
  showToast('Código importado para a grade.');
});

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

buildGrids();
