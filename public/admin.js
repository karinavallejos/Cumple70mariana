let adminKey = localStorage.getItem('kbday_adminkey') || '';
let currentState = null;
let pollTimer = null;
let renderedVideoUrl;
let renderedEditorKey;
let editorPanX = 0, editorPanY = 0, editorZoom = 8;
let editorDragging = false, editorDragStartX = 0, editorDragStartY = 0, editorDragStartPanX = 0, editorDragStartPanY = 0;

function applyEditorTransform() {
  const img = document.getElementById('editorImg');
  if (!img) return;
  img.style.transform = `translate(${editorPanX}px, ${editorPanY}px) scale(${editorZoom})`;
}

function showToast(message) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.position = 'fixed';
    toast.style.top = '12px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#A32D2D';
    toast.style.color = '#fff';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.maxWidth = '90%';
    toast.style.textAlign = 'center';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

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
  for (let i = 1; i <= 20; i++) opts += `<option value="${i}">Imagen ${i}</option>`;
  return `
    <div class="center"><h1 style="font-size:24px;">Panel del anfitrión</h1></div>
    <div class="card">
      <div class="row">
        <button class="secondary" id="modeZoom">Juego de zoom</button>
        <button class="secondary" id="modeVideo">Video</button>
      </div>
    </div>
    <div id="editorPanel"></div>
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
    catch (e) { showToast(e.message); }
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
  catch (e) { showToast(e.message); }
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

  const editorPanel = document.getElementById('editorPanel');
  const zoomPanel = document.getElementById('zoomPanel');
  const videoPanel = document.getElementById('videoPanel');

  if (currentState.mode === 'zoom') {
    const roundKey = 'r' + currentState.round;
    if (renderedEditorKey !== roundKey) {
      renderedEditorKey = roundKey;
      editorPanX = 0; editorPanY = 0; editorZoom = 8;
      editorPanel.innerHTML = `
        <div class="card">
          <h3 style="font-size:17px;">Elegir el zoom inicial de esta imagen</h3>
          <p class="muted">Arrastra la foto con el dedo para moverla, y usa la barra para acercar. Cuanto más a la derecha, más cerca.</p>
          <div class="zoombox" id="editorBox" style="touch-action:none;">
            <img id="editorImg" alt="" style="width:100%; height:100%; object-fit:cover; display:block; touch-action:none; cursor:grab;">
          </div>
          <div class="row" style="align-items:center;">
            <span class="muted" style="flex:0 0 auto; margin:0;">Zoom: <strong id="zoomLevelLabel">8.0x</strong></span>
          </div>
          <input type="range" id="zoomSlider" min="1" max="25" step="0.5" value="8" style="width:100%; margin:8px 0 14px;">
          <button class="gold" id="btnSaveZoom">Guardar este zoom inicial</button>
          <p class="muted hidden" id="editorMsg" style="text-align:center; margin-top:4px;"></p>
        </div>`;
      const img = document.getElementById('editorImg');
      resolveImageUrl(currentState.round + 1).then((url) => { if (url) img.src = url; });
      applyEditorTransform();

      img.addEventListener('pointerdown', (e) => {
        editorDragging = true;
        editorDragStartX = e.clientX; editorDragStartY = e.clientY;
        editorDragStartPanX = editorPanX; editorDragStartPanY = editorPanY;
        img.setPointerCapture(e.pointerId);
        img.style.cursor = 'grabbing';
      });
      img.addEventListener('pointermove', (e) => {
        if (!editorDragging) return;
        e.preventDefault();
        editorPanX = editorDragStartPanX + (e.clientX - editorDragStartX);
        editorPanY = editorDragStartPanY + (e.clientY - editorDragStartY);
        applyEditorTransform();
      });
      const stopDrag = () => { editorDragging = false; img.style.cursor = 'grab'; };
      img.addEventListener('pointerup', stopDrag);
      img.addEventListener('pointercancel', stopDrag);

      document.getElementById('zoomSlider').oninput = (e) => {
        editorZoom = parseFloat(e.target.value);
        document.getElementById('zoomLevelLabel').textContent = editorZoom.toFixed(1) + 'x';
        applyEditorTransform();
      };

      document.getElementById('btnSaveZoom').onclick = async () => {
        const btn = document.getElementById('btnSaveZoom');
        const msg = document.getElementById('editorMsg');
        const box = document.getElementById('editorBox');
        const editImg = document.getElementById('editorImg');
        const boxRect = box.getBoundingClientRect();
        const imgRect = editImg.getBoundingClientRect();
        msg.classList.remove('hidden');
        if (!boxRect.width || !imgRect.width) {
          msg.textContent = 'Espera un segundo a que cargue la foto e intenta de nuevo.';
          msg.classList.add('error');
          return;
        }
        const scale = imgRect.width / boxRect.width;
        let fx = ((boxRect.left + boxRect.width / 2) - imgRect.left) / imgRect.width;
        let fy = ((boxRect.top + boxRect.height / 2) - imgRect.top) / imgRect.height;
        fx = Math.min(0.98, Math.max(0.02, fx)) * 100;
        fy = Math.min(0.98, Math.max(0.02, fy)) * 100;
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        msg.classList.remove('error');
        msg.textContent = '';
        try {
          await apiPost('/api/round-setting', { initialScale: scale, focusX: fx, focusY: fy }, adminKey);
          btn.textContent = 'Guardar este zoom inicial';
          btn.disabled = false;
          msg.textContent = '✓ Zoom guardado. Bájalo con "Alejar zoom" para revisarlo, o muéstralo a los invitados.';
          msg.classList.remove('error');
          refreshState();
        } catch (e) {
          btn.textContent = 'Guardar este zoom inicial';
          btn.disabled = false;
          msg.textContent = e.message;
          msg.classList.add('error');
        }
      };
    }

    const atFull = currentState.zoomIndex >= ZOOM_STEPS - 1;
    const buzzes = currentState.buzzes || [];
    const visible = currentState.imageVisible;
    zoomPanel.innerHTML = `
      <div class="card">
        <span class="tag gold">Imagen ${currentState.round + 1} de ${currentState.roundCount}</span>
        <span class="tag" style="${visible ? '' : 'background:#F1E4EC;'}">${visible ? '👁 Visible para invitados' : '🚫 Oculta para invitados'}</span>
        <p class="muted">Así se ve (o se verá) en los celulares de los invitados:</p>
        <div class="zoombox" id="zbox"></div>
        <button class="${visible ? 'ghost' : 'gold'}" id="btnToggleVisible">${visible ? 'Ocultar de los invitados' : 'Mostrar a los invitados'}</button>
        <hr>
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
    await paintZoomBox(box, currentState.round + 1, currentState.zoomIndex, currentState.focusX, currentState.focusY, currentState.initialScale);
    document.getElementById('btnToggleVisible').onclick = () => {
      const endpoint = visible ? '/api/hide-image' : '/api/show-image';
      apiPost(endpoint, {}, adminKey).then(refreshState);
    };
    document.getElementById('btnZoomOut').onclick = () => apiPost('/api/zoom-out', {}, adminKey).then(refreshState);
    document.getElementById('btnShowFull').onclick = () => apiPost('/api/show-full', {}, adminKey).then(refreshState);
    document.getElementById('btnNext').onclick = () => apiPost('/api/next-round', {}, adminKey).then(refreshState);
    document.getElementById('btnResetOrder').onclick = () => apiPost('/api/reset-order', {}, adminKey).then(refreshState);
    videoPanel.innerHTML = '';
  } else {
    editorPanel.innerHTML = '';
    renderedEditorKey = undefined;
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
        catch (e) { showToast(e.message); }
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



