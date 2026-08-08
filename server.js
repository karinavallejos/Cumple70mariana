const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_KEY = process.env.ADMIN_KEY || 'cumple123';
const ROUND_COUNT = 15;
const ZOOM_STEPS = 6;

function defaultRoundSetting() {
  return { initialScale: 8, focusX: 50, focusY: 50 };
}

function defaultState(epoch) {
  const roundSettings = [];
  for (let i = 0; i < ROUND_COUNT; i++) roundSettings.push(defaultRoundSetting());
  return {
    epoch: epoch || 0,
    roundCount: ROUND_COUNT,
    mode: 'zoom',
    round: 0,
    zoomIndex: 0,
    roundSettings,
    buzzes: [],
    players: [],
    video: { url: '', playing: false, baseTime: 0, updatedAt: Date.now() }
  };
}

let state = defaultState(0);

function publicState() {
  const rs = state.roundSettings[state.round];
  return Object.assign({}, state, {
    focusX: rs.focusX,
    focusY: rs.focusY,
    initialScale: rs.initialScale
  });
}

function checkAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Clave de anfitrión incorrecta' });
  }
  next();
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/state', (req, res) => {
  res.json(publicState());
});

app.post('/api/register', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Falta el nombre' });
  const exists = state.players.some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    state.players.push({ name, joinedAt: Date.now() });
  }
  res.json({ ok: true, epoch: state.epoch });
});

app.post('/api/admin-check', checkAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post('/api/mode', checkAdmin, (req, res) => {
  if (req.body.mode === 'zoom' || req.body.mode === 'video') {
    state.mode = req.body.mode;
  }
  res.json(publicState());
});

app.post('/api/goto-round', checkAdmin, (req, res) => {
  let n = parseInt(req.body.round, 10);
  if (isNaN(n) || n < 1 || n > ROUND_COUNT) return res.status(400).json({ error: 'Número de imagen inválido' });
  state.round = n - 1;
  state.zoomIndex = 0;
  state.buzzes = [];
  res.json(publicState());
});

app.post('/api/next-round', checkAdmin, (req, res) => {
  if (state.round < ROUND_COUNT - 1) {
    state.round += 1;
    state.zoomIndex = 0;
    state.buzzes = [];
  }
  res.json(publicState());
});

app.post('/api/round-setting', checkAdmin, (req, res) => {
  let scale = parseFloat(req.body.initialScale);
  let fx = parseFloat(req.body.focusX);
  let fy = parseFloat(req.body.focusY);
  if (isNaN(scale) || isNaN(fx) || isNaN(fy)) return res.status(400).json({ error: 'Datos de zoom inválidos' });
  scale = Math.min(25, Math.max(1, scale));
  fx = Math.min(98, Math.max(2, fx));
  fy = Math.min(98, Math.max(2, fy));
  state.roundSettings[state.round] = { initialScale: scale, focusX: fx, focusY: fy };
  state.zoomIndex = 0;
  state.buzzes = [];
  res.json(publicState());
});

app.post('/api/zoom-out', checkAdmin, (req, res) => {
  state.zoomIndex = Math.min(state.zoomIndex + 1, ZOOM_STEPS - 1);
  res.json(publicState());
});

app.post('/api/show-full', checkAdmin, (req, res) => {
  state.zoomIndex = ZOOM_STEPS - 1;
  res.json(publicState());
});

app.post('/api/reset-order', checkAdmin, (req, res) => {
  state.buzzes = [];
  res.json(publicState());
});

app.post('/api/buzz', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Falta el nombre' });
  const already = state.buzzes.some((b) => b.name === name);
  if (!already) {
    state.buzzes.push({ name, time: Date.now() });
  }
  res.json({ ok: true });
});

app.post('/api/video', checkAdmin, (req, res) => {
  state.video = { url: (req.body.url || '').trim(), playing: false, baseTime: 0, updatedAt: Date.now() };
  res.json(publicState());
});

app.post('/api/video/play', checkAdmin, (req, res) => {
  state.video.playing = true;
  state.video.baseTime = req.body.currentTime || 0;
  state.video.updatedAt = Date.now();
  res.json(publicState());
});

app.post('/api/video/pause', checkAdmin, (req, res) => {
  state.video.playing = false;
  state.video.baseTime = req.body.currentTime || 0;
  state.video.updatedAt = Date.now();
  res.json(publicState());
});

app.post('/api/video/restart', checkAdmin, (req, res) => {
  state.video.playing = false;
  state.video.baseTime = 0;
  state.video.updatedAt = Date.now();
  res.json(publicState());
});

app.post('/api/reset-game', checkAdmin, (req, res) => {
  const nextEpoch = state.epoch + 1;
  state = defaultState(nextEpoch);
  res.json(publicState());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor del juego corriendo en el puerto ' + PORT);
});
