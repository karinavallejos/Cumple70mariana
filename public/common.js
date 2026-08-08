const ZOOM_STEPS = 6;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const imageUrlCache = {};

function computeZoomScales(initialScale, steps) {
  steps = steps || ZOOM_STEPS;
  const s0 = Math.max(1, initialScale || 1);
  if (s0 <= 1) return new Array(steps).fill(1);
  const ratio = Math.pow(1 / s0, 1 / (steps - 1));
  const scales = [];
  for (let i = 0; i < steps; i++) scales.push(s0 * Math.pow(ratio, i));
  scales[steps - 1] = 1;
  return scales;
}

async function apiGet(path) {
  const r = await fetch(path);
  return r.json();
}
async function apiPost(path, body, adminKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminKey) headers['x-admin-key'] = adminKey;
  const r = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Error');
  return data;
}

function probeImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

async function resolveImageUrl(roundNumber) {
  if (imageUrlCache[roundNumber]) return imageUrlCache[roundNumber];
  for (const ext of IMAGE_EXTENSIONS) {
    const url = `/images/${roundNumber}.${ext}`;
    try {
      await probeImage(url);
      imageUrlCache[roundNumber] = url;
      return url;
    } catch (e) { /* try next extension */ }
  }
  return null;
}

async function paintZoomBox(boxEl, round1based, zoomIndex, focusX, focusY, initialScale) {
  const url = await resolveImageUrl(round1based);
  if (!url) {
    boxEl.innerHTML = '<p class="muted" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:0 20px; text-align:center; margin:0;">No se encontró la imagen ' + round1based + '. Revisa que esté en la carpeta de imágenes.</p>';
    return;
  }
  let img = boxEl.querySelector('img');
  if (!img || boxEl.dataset.currentUrl !== url) {
    boxEl.innerHTML = '<img alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">';
    img = boxEl.querySelector('img');
    img.src = url;
    boxEl.dataset.currentUrl = url;
  }
  const scales = computeZoomScales(initialScale);
  img.style.transformOrigin = `${focusX}% ${focusY}%`;
  img.style.transform = `scale(${scales[zoomIndex]})`;
}

