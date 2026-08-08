let adminKey = localStorage.getItem('kbday_adminkey') || '';
let currentState = null;
let pollTimer = null;
let renderedVideoUrl;

function render() {
  const app = document.getElementById('app');
  if (!adminKey) {
    app.innerHTML = viewKeyPrompt();
    bindKeyPrompt();
    return;
  }
  app.innerHTML = viewAdmin();
  bindAdmin();
  startPolling();
}

function viewKeyPrompt() {
  return `
    <div class="center" style="padding-top:30px;">
      <h1 style="font-size:26px;">Panel del anfitrión</h1>
      <p class="muted">Ingresa la clave (variable ADMIN_KEY en Render)</p>
    </div>
    <div class="card">
      <input type="text" id="keyInput" placeholder="Clave">
      <p class="error hidden" id="keyError"></p>
      <button class="primary" id="btnKeyGo">Entrar al panel</button>
    </div>`;
}
function bindKeyPrompt() {
  document.getElementById('btnKeyGo').onclick = async () => {
    const v = document.getElementById('keyInput').value.trim();
    if (!v) return;
    try {
      await apiPost('/api/admin-check', {}, v);
      adminKey = v;
      localStorage.setItem('kbday_adminkey', v);
      render();
    } catch (e) {
      const err = document.getElementById('keyError');
      err.textContent = 'Clave incorrecta';
      err.classList.remove('hidden');
    }
  };
}

function viewAdmin() {
  let opts = '';
  for (let i = 1; i <= 15; i++) opts += `<option value="${i}">Imagen ${i}</option>`;
  return `
    <div class="center"><h1 style="font-size:24px;">Panel del anfitrión</h1></div>
    <div class="card">
      <div class="row">
        <button class="secondary" id="modeZoom">Juego de zoom</button>
        <button class="secondary" id="modeVideo">Video</button>
      </div>
    </div>
    <div id="zoomPanel"></div>
    <div id="videoPanel"></div>
    <div class="card">
      <h3 style="font-size:17px;">Ir directo a una imagen</h3>
      <select id="roundSelect">${opts}</select>
      <button class="secondary" id="btnGoto">Ir a esta imagen</button>
    </div>
    <div class="card">
      <h3 style="font-size:17px;">Invitados registrados (<span id="playerCount">0</span>)</h3>
      <ul class="playerlist" id="playerList"></ul>
    </div>
    <div class="card">
      <h3 style="font-size:17px;">Compartir</h3>
      <p class="muted">Código QR para que los invitados entren directo a jugar.</p>
      <div class="center"><div id="qrbox"></div></div>
    </div>
    <div class="card">
      <button class="ghost" id="btnResetGame">Reiniciar juego de cero (expulsa a todos)</button>
    </div>`;
}

function bindAdmin() {
  document.getElementById('modeZoom').onclick = () => setMode('zoom');
  document.getElementById('modeVideo').onclick = () => setMode('video');
  document.getElementById('btnGoto').onclick = async () => {
    const n = parseInt(document.getElementById('roundSelect').value, 10);
    try { await apiPost('/api/goto-round', { round: n }, adminKey); refreshState(); }
    catch (e) { alert(e.message); }
  };
  document.getElementById('btnResetGame').onclick = async () => {
    if (!confirm('Esto reinicia todo y todos los invitados deberán volver a escribir su nombre. ¿Continuar?')) return;
    await apiPost('/api/reset-game', {}, adminKey);
    refreshState();
  };
  const qrbox = document.getElementById('qrbox');
  if (window.QRCode) new QRCode(qrbox, { text: window.location.origin, width: 200, height: 200 });
}

async function setMode(mode) {
  try { await apiPost('/api/mode', { mode }, adminKey); refreshState(); }
  catch (e) { alert(e.message); }
}

function startPolling() {
  clearInterval(pollTimer);
  refreshState();
  pollTimer = setInterval(refreshState, 1500);
}

async function refreshState() {
  try { currentState = await apiGet('/api/state'); }
  catch (e) { return; }
  renderDynamic();
}

async function renderDynamic() {
  document.getElementById('modeZoom').className = currentState.mode === 'zoom' ? 'primary' : 'secondary';
  document.getElementById('modeVideo').className = currentState.mode === 'video' ? 'primary' : 'secondary';

  const players = currentState.players || [];
  document.getElementById('playerCount').textContent = players.length;
  document.getElementById('playerList').innerHTML = players.length === 0
    ? '<li>Todavía nadie se ha registrado</li>'
    : players.map((p) => `<li>${p.name}</li>`).join('');

  const zoomPanel = document.getElementById('zoomPanel');
  const videoPanel = document.getElementById('videoPanel');

  if (currentState.mode === 'zoom') {
    const atFull = currentState.zoomIndex >= 3;
    const buzzes = currentState.buzzes || [];
    zoomPanel.innerHTML = `
      <div class="card">
        <span class="tag">Imagen ${currentState.round + 1} de ${currentState.roundCount}</span>
        <div class="zoombox" id="zbox"></div>
        <button class="primary" id="btnZoomOut" ${atFull ? 'disabled' : ''}>Alejar zoom</button>
        <button class="secondary" id="btnShowFull" ${atFull ? 'disabled' : ''}>Ver imagen completa</button>
        <button class="secondary" id="btnNext" ${currentState.round >= currentState.roundCount - 1 ? 'disabled' : ''}>Siguiente imagen</button>
      </div>
      <div class="card">
        <h3 style="font-size:17px;">Orden de quién avisó</h3>
        ${buzzes.length === 0 ? '<p class="muted">Nadie ha avisado todavía</p>' :
          `<ul class="buzzlist">${buzzes.map((b, i) => `<li><strong>${i + 1}.</strong> ${b.name}</li>`).join('')}</ul>`}
        <button class="ghost" id="btnResetOrder">Reiniciar orden de esta imagen</button>
      </div>`;
    const box = document.getElementById('zbox');
    await paintZoomBox(box, currentState.round + 1, currentState.zoomIndex, currentState.focusX, currentState.focusY);
    document.getElementById('btnZoomOut').onclick = () => apiPost('/api/zoom-out', {}, adminKey).then(refreshState);
    document.getElementById('btnShowFull').onclick = () => apiPost('/api/show-full', {}, adminKey).then(refreshState);
    document.getElementById('btnNext').onclick = () => apiPost('/api/next-round', {}, adminKey).then(refreshState);
    document.getElementById('btnResetOrder').onclick = () => apiPost('/api/reset-order', {}, adminKey).then(refreshState);
    videoPanel.innerHTML = '';
  }

  if (currentState.mode === 'video') {
    zoomPanel.innerHTML = '';
    if (renderedVideoUrl !== currentState.video.url || !document.getElementById('adminVideo')) {
      renderedVideoUrl = currentState.video.url;
      videoPanel.innerHTML = `
        <div class="card">
          <h3 style="font-size:17px;">Video para todos</h3>
          <p class="muted">Link directo a un archivo .mp4 (Dropbox con dl=1, o Drive).</p>
          <input type="text" id="videoUrlInput" placeholder="https://.../video.mp4" value="${currentState.video.url || ''}">
          <button class="secondary" id="btnSetVideo">Usar este video</button>
          <video id="adminVideo" controls playsinline ${currentState.video.url ? `src="${currentState.video.url}"` : ''}></video>
          <div class="row" style="margin-top:10px;">
            <button class="primary" id="btnPlay">Reproducir</button>
            <button class="secondary" id="btnPause">Pausar</button>
          </div>
          <button class="ghost" id="btnRestartVideo">Reiniciar video</button>
        </div>`;
      document.getElementById('btnSetVideo').onclick = async () => {
        const url = document.getElementById('videoUrlInput').value.trim();
        try { await apiPost('/api/video', { url }, adminKey); refreshState(); }
        catch (e) { alert(e.message); }
      };
      const vid = document.getElementById('adminVideo');
      document.getElementById('btnPlay').onclick = async () => {
        vid.play().catch(() => {});
        await apiPost('/api/video/play', { currentTime: vid.currentTime || 0 }, adminKey);
      };
      document.getElementById('btnPause').onclick = async () => {
        vid.pause();
        await apiPost('/api/video/pause', { currentTime: vid.currentTime || 0 }, adminKey);
      };
      document.getElementById('btnRestartVideo').onclick = async () => {
        vid.currentTime = 0;
        await apiPost('/api/video/restart', {}, adminKey);
      };
    }
  }
}

render();

