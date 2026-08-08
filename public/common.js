const ZOOM_SCALES = [7.5, 4.2, 2.2, 1.0];
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
  img.style.transformOrigin = `${focusX}% ${focusY}%`;
  img.style.transform = `scale(${ZOOM_SCALES[zoomIndex]})`;
}
