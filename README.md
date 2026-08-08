# Juego cumple de mamá

App en tonos lila y dorado para jugar en vivo con el celu: 15 fotos con zoom que se van
revelando en 4 pasos, orden de quién avisó primero, lista de invitados registrados, y un
video que se reproduce sincronizado en todos los celulares.

## Antes de subir a GitHub: pon tus fotos

Dentro de `public/images/` pon tus 15 fotos numeradas exactamente así:

```
1.jpg   2.jpg   3.jpg   ...   15.jpg
```

(también acepta `.png` o `.webp`, siempre y cuando el número sea correcto). Borra el
archivo `LEEME.txt` de esa carpeta cuando termines.

## Los dos links

- **Para los invitados** (el que va en el QR): la URL normal, por ejemplo
  `https://tu-app.onrender.com`. Ahí solo pueden escribir su nombre, ver la foto con zoom
  o el video, y tocar "¡Tengo una idea!". No pueden hacer nada más.
- **Para ti (anfitriona)**: la misma URL con `/admin` al final, por ejemplo
  `https://tu-app.onrender.com/admin`. Ahí controlas todo. No compartas este link.

## 1. Subir a GitHub

Como tu repo `Cumple70mariana` está vacío, la forma más simple es:

1. Ve a https://github.com/karinavallejos/Cumple70mariana
2. Click en el link para subir un archivo existente
3. Arrastra **todo el contenido** de la carpeta `party-game` (incluida la carpeta
   `public` con tus fotos ya adentro)
4. Escribe un mensaje y click en "Commit changes"

(También puedes usar `git init / add / commit / push` desde la terminal si prefieres.)

## 2. Desplegar en Render

1. Entra a https://render.com (puedes entrar con tu cuenta de GitHub)
2. **New +** → **Web Service** → conecta el repo `Cumple70mariana`
3. Configura:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. En **Environment**, agrega la variable `ADMIN_KEY` con una clave que solo tú
   conozcas (ej: `mama70`). Esa es la clave para entrar a `/admin`.
5. **Create Web Service** y espera un par de minutos.
6. Copia la URL que te da Render — esa es la que compartes por QR (sin `/admin`).

## 3. El día de la fiesta

1. Abre `tu-app.onrender.com/admin` en tu celu y entra con tu clave.
2. Ahí verás el código QR — proyéctalo o muéstralo en tu pantalla para que todos escaneen.
3. Cada invitado escanea, escribe su nombre, y aparece en tu lista de "Invitados
   registrados" en tiempo real.
4. Controla el zoom con "Alejar zoom" (4 pasos), o salta directo a cualquier imagen del
   1 al 15 con el selector.
5. Cuando alguien avisa "tengo una idea", anota en papel qué dijo — tú ves el orden en
   que fueron avisando.
6. "Reiniciar orden de esta imagen" borra solo la lista de avisos de la imagen actual
   (para repetir la ronda si es necesario).
7. "Reiniciar juego de cero" borra todo — invitados, fotos, avisos — y todos deberán
   volver a escribir su nombre. Úsalo solo si quieres empezar todo desde el principio.
8. Para el video: cambia a la pestaña "Video", pega un link directo a un `.mp4`
   (Dropbox cambiando `dl=0` por `dl=1` al final del link, o Google Drive con acceso
   "cualquiera con el link"). Dropbox suele ser más estable.

### Importante sobre el plan gratis de Render

Se "duerme" tras inactividad y tarda ~30-50 segundos en despertar. Abre tú la página
antes de que lleguen los invitados para que esté lista.

### Antes del evento

Prueba con 2-3 celulares en datos móviles (no wifi) un día antes, para confirmar que
las fotos y el video cargan bien.
