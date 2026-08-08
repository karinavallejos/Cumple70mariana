let guestName = localStorage.getItem('kbday_name') || '';
let storedEpoch = parseInt(localStorage.getItem('kbday_epoch') || '-1', 10);
let hasBuzzed = false;
let lastRoundKey = null;
let currentState = null;
let pollTimer = null;

function render() {
  const app = document.getElementById('app');
  if (!guestName) {
    app.innerHTML = viewNamePrompt();
    bindNamePrompt();
    return;
  }
  app.innerHTML = viewGame();
  startPolling();
}

function viewNamePrompt() {
  return `
    <div class="center" style="padding-top:30px;">
      <h1 style="font-size:28px;">Cumple de mamá</h1>
      <p class="muted">Escribe tu nombre para jugar</p>
    </div>
    <div class="card">
      <input type="text" id="nameInput" placeholder="Tu nombre">
      <p class="error hidden" id="nameError"></p>
      <button class="primary" id="btnJoin">Entrar al juego</button>
    </div>`;
}
function bindNamePrompt() {
  document.getElementById('btnJoin').onclick = async () => {
    const v = document.getElementById('nameInput').value.trim();
    if (!v) return;
    try {
      const res = await apiPost('/api/register', { name: v });
      guestName = v;
      storedEpoch = res.epoch;
      localStorage.setItem('kbday_name', v);
      localStorage.setItem('kbday_epoch', String(res.epoch));
      render();
    } catch (e) {
      const err = document.getElementById('nameError');
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  };
}

function viewGame() {
  return `
    <div class="center"><h2 style="font-size:20px;">Hola, ${guestName}</h2></div>
    <div id="content"></div>`;
}

function startPolling() {
  clearInterval(pollTimer);
  refreshState();
  pollTimer = setInterval(refreshState, 1500);
}

async function refreshState() {
  try {
    currentState = await apiGet('/api/state');
  } catch (e) { return; }

  if (currentState.epoch !== storedEpoch) {
    localStorage.removeItem('kbday_name');
    localStorage.removeItem('kbday_epoch');
    guestName = '';
    clearInterval(pollTimer);
    render();
    return;
  }

  const roundKey = currentState.mode + ':' + currentState.round;
  if (roundKey !== lastRoundKey) {
    hasBuzzed = false;
    lastRoundKey = roundKey;
    await apiPost('/api/register', { name: guestName }).catch(() => {});
  }

  renderContent();
}

async function renderContent() {
  const el = document.getElementById('content');
  if (!el || !currentState) return;

  if (currentState.mode === 'zoom') {
    el.innerHTML = `
      <div class="card">
        <span class="tag">Imagen ${currentState.round + 1} de ${currentState.roundCount}</span>
        <div class="zoombox" id="zbox"></div>
        <button class="gold" id="btnBuzz" ${hasBuzzed ? 'disabled' : ''}>${hasBuzzed ? 'Ya avisaste' : '¡Tengo una idea!'}</button>
      </div>`;
    const box = document.getElementById('zbox');
    await paintZoomBox(box, currentState.round + 1, currentState.zoomIndex, currentState.focusX, currentState.focusY);
    const btn = document.getElementById('btnBuzz');
    if (btn) btn.onclick = async () => {
      hasBuzzed = true;
      renderContent();
      try { await apiPost('/api/buzz', { name: guestName }); } catch (e) {}
    };
  }

  if (currentState.mode === 'video') {
    const v = currentState.video || {};
    if (!v.url) {
      el.innerHTML = `<div class="card center"><p class="muted">El anfitrión todavía no puso el video.</p></div>`;
      return;
    }
    if (!document.getElementById('guestVideo') || el.dataset.videoUrl !== v.url) {
      el.dataset.videoUrl = v.url;
      el.innerHTML = `
        <div class="card">
          <div class="videoOverlay">
            <video id="guestVideo" src="${v.url}" playsinline muted></video>
            <div class="tapPlay" id="tapPlay">Toca para activar el video</div>
          </div>
        </div>`;
      document.getElementById('tapPlay').onclick = () => {
        const vid = document.getElementById('guestVideo');
        vid.muted = false;
        vid.play().catch(() => {});
        document.getElementById('tapPlay').classList.add('hidden');
      };
    }
    const vid = document.getElementById('guestVideo');
    if (vid) {
      const expected = v.playing ? v.baseTime + (Date.now() - v.updatedAt) / 1000 : v.baseTime;
      if (Math.abs((vid.currentTime || 0) - expected) > 1.5) { vid.currentTime = expected; }
      if (v.playing && vid.paused) { vid.play().catch(() => {}); }
      if (!v.playing && !vid.paused) { vid.pause(); }
    }
  }
}

render();
