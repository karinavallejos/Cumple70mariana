const ZOOM_BG_SIZES = ['480% 480%', '300% 300%', '190% 190%', 'cover'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const imageUrlCache = {};

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

async function paintZoomBox(boxEl, round1based, zoomIndex, focusX, focusY) {
  const url = await resolveImageUrl(round1based);
  if (!url) {
    boxEl.style.backgroundImage = 'none';
    boxEl.innerHTML = '<p class="muted" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:0 20px; text-align:center;">No se encontró la imagen ' + round1based + '. Revisa que esté en la carpeta de imágenes.</p>';
    return;
  }
  boxEl.innerHTML = '';
  boxEl.style.backgroundImage = `url(${url})`;
  boxEl.style.backgroundSize = ZOOM_BG_SIZES[zoomIndex];
  boxEl.style.backgroundPosition = `${focusX}% ${focusY}%`;
}
