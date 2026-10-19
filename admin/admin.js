(() => {
  // El panel guarda los productos en el repositorio de GitHub a través de su API.
  // La tienda se vuelve a publicar sola en GitHub Pages después de cada cambio.
  const TOKEN_KEY = "variete-admin-token";
  const PRODUCTS_PATH = "data/productos.json";
  const IMG_DIR = "img/productos";
  const MAX_IMG = 1200; // px del lado mayor al subir fotos

  const { owner, repo, branch } = CONFIG.github;
  const API = `https://api.github.com/repos/${owner}/${repo}/contents/`;
  const $ = (sel) => document.querySelector(sel);

  let token = "";
  let productos = [];
  let productosSha = null;
  let editando = null; // producto en edición, o null si es nuevo
  let fotoNueva = null; // { base64, ext }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const formatPrice = (n) =>
    new Intl.NumberFormat(CONFIG.locale, {
      style: "currency", currency: CONFIG.moneda, maximumFractionDigits: 0,
    }).format(n);

  // ---------- Base64 con soporte de acentos ----------
  const toBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  };
  const fromBase64 = (b64) =>
    new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  // ---------- API de GitHub ----------
  async function gh(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = new Error(`GitHub respondió ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  async function cargarProductos() {
    const file = await gh(`${PRODUCTS_PATH}?ref=${branch}&t=${Date.now()}`);
    productosSha = file.sha;
    productos = JSON.parse(fromBase64(file.content));
  }

  async function guardarProductos(mensaje) {
    const res = await gh(PRODUCTS_PATH, {
      method: "PUT",
      body: JSON.stringify({
        message: mensaje,
        content: toBase64(JSON.stringify(productos, null, 2) + "\n"),
        sha: productosSha,
        branch,
      }),
    });
    productosSha = res.content.sha;
  }

  async function subirFoto(id, foto) {
    const path = `${IMG_DIR}/${id}-${Date.now()}.${foto.ext}`;
    await gh(path, {
      method: "PUT",
      body: JSON.stringify({ message: `Foto de ${id}`, content: foto.base64, branch }),
    });
    return path;
  }

  async function borrarArchivo(path) {
    if (!path || !path.startsWith(IMG_DIR + "/")) return;
    try {
      const file = await gh(`${path}?ref=${branch}`);
      await gh(path, {
        method: "DELETE",
        body: JSON.stringify({ message: `Elimino ${path}`, sha: file.sha, branch }),
      });
    } catch {
      // Si la foto ya no existe no es un problema
    }
  }

  // ---------- Fotos: se reducen en el navegador antes de subirlas ----------
  function prepararFoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, MAX_IMG / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; // fondo blanco para PNG transparentes
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(img.src);
        resolve({ dataUrl, base64: dataUrl.split(",")[1], ext: "jpg" });
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Utilidades ----------
  const slug = (text) =>
    text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "producto";

  function idUnico(nombre) {
    const base = slug(nombre);
    let id = base;
    for (let n = 2; productos.some((p) => p.id === id); n++) id = `${base}-${n}`;
    return id;
  }

  // Lee la foto directo del repositorio: GitHub Pages tarda en publicar las nuevas
  const imgSrc = (p) =>
    p.imagen ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${p.imagen}` : "";

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function ocupado(texto) {
    $("#busy").hidden = !texto;
    if (texto) $("#busyText").textContent = texto;
  }

  function mensajeError(err) {
    if (err.status === 401) return "La clave no es válida o venció. Vuelve a entrar.";
    if (err.status === 403 || err.status === 404) return "La clave no tiene permiso de escritura sobre el repositorio.";
    if (err.status === 409) return "Alguien más cambió los productos. Recarga la página e inténtalo de nuevo.";
    return "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
  }

  // ---------- Vistas ----------
  function mostrarLogin(error) {
    $("#loginView").hidden = false;
    $("#adminView").hidden = true;
    $("#logout").hidden = true;
    $("#loginError").hidden = !error;
    $("#loginError").textContent = error || "";
  }

  function mostrarPanel() {
    $("#loginView").hidden = true;
    $("#adminView").hidden = false;
    $("#logout").hidden = false;
    renderLista();
  }

  function renderLista() {
    $("#productCount").textContent = `(${productos.length})`;
    $("#list").innerHTML = productos.length
      ? productos.map((p) => `
          <button class="admin-row" data-id="${esc(p.id)}">
            ${p.imagen ? `<img src="${esc(imgSrc(p))}" alt="">` : `<img alt="">`}
            <div>
              <h3>${esc(p.nombre)}</h3>
              <small>${esc(CATEGORIAS[p.categoria] || p.categoria)}</small>
            </div>
            <span class="price">${formatPrice(p.precio)}</span>
          </button>`).join("")
      : `<p class="muted">Todavía no hay productos. Crea el primero con “+ Nuevo producto”.</p>`;
  }

  function abrirEditor(producto) {
    editando = producto;
    fotoNueva = null;
    $("#productForm").reset();
    $("#editorTitle").textContent = producto ? "Editar producto" : "Nuevo producto";
    $("#deleteBtn").hidden = !producto;
    $("#nombre").value = producto?.nombre || "";
    $("#categoria").value = producto?.categoria || Object.keys(CATEGORIAS)[0];
    $("#precio").value = producto?.precio ?? "";
    $("#descripcion").value = producto?.descripcion || "";
    $("#photoPreview").src = producto ? imgSrc(producto) : "";
    $("#photoHint").textContent = producto?.imagen ? "Cambiar foto" : "Toca para elegir una foto";
    $("#editor").classList.add("open");
    $("#editor").setAttribute("aria-hidden", "false");
    $("#overlay").hidden = false;
    document.body.classList.add("no-scroll");
  }

  function cerrarEditor() {
    $("#editor").classList.remove("open");
    $("#editor").setAttribute("aria-hidden", "true");
    $("#overlay").hidden = true;
    document.body.classList.remove("no-scroll");
  }

  // ---------- Acciones ----------
  async function entrar(nuevoToken) {
    token = nuevoToken;
    ocupado("Cargando productos…");
    try {
      await cargarProductos();
      try { localStorage.setItem(TOKEN_KEY, token); } catch {}
      mostrarPanel();
    } catch (err) {
      token = "";
      try { localStorage.removeItem(TOKEN_KEY); } catch {}
      mostrarLogin(err.status === 401 || err.status === 404
        ? "La clave no es válida o no tiene acceso al repositorio."
        : "No se pudo conectar con GitHub. Revisa tu conexión.");
    } finally {
      ocupado(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    const datos = {
      nombre: $("#nombre").value.trim(),
      categoria: $("#categoria").value,
      precio: Math.max(0, Math.round(Number($("#precio").value))),
      descripcion: $("#descripcion").value.trim(),
    };
    if (!datos.nombre) return;

    ocupado("Guardando y publicando…");
    try {
      // Trae la última versión por si se editó desde otro dispositivo
      await cargarProductos();
      const actual = editando && productos.find((p) => p.id === editando.id);
      const id = actual ? actual.id : idUnico(datos.nombre);
      let imagen = actual?.imagen || "";

      if (fotoNueva) {
        const anterior = imagen;
        imagen = await subirFoto(id, fotoNueva);
        await borrarArchivo(anterior);
      }

      const producto = { id, ...datos, imagen };
      if (actual) productos[productos.indexOf(actual)] = producto;
      else productos.unshift(producto); // los nuevos aparecen primero

      await guardarProductos(`${actual ? "Edito" : "Agrego"} producto: ${datos.nombre}`);
      cerrarEditor();
      renderLista();
      toast("¡Listo! Se verá en la tienda en 1 o 2 minutos.");
    } catch (err) {
      if (err.status === 401) return salir(mensajeError(err));
      toast(mensajeError(err));
    } finally {
      ocupado(false);
    }
  }

  async function eliminar() {
    if (!editando) return;
    // Se confirma dentro del propio botón para no usar ventanas emergentes
    const btn = $("#deleteBtn");
    if (!btn.dataset.confirm) {
      btn.dataset.confirm = "1";
      btn.textContent = "Toca de nuevo para confirmar";
      setTimeout(() => { delete btn.dataset.confirm; btn.textContent = "Eliminar producto"; }, 4000);
      return;
    }
    delete btn.dataset.confirm;
    btn.textContent = "Eliminar producto";

    ocupado("Eliminando…");
    try {
      await cargarProductos();
      const actual = productos.find((p) => p.id === editando.id);
      if (actual) {
        productos = productos.filter((p) => p !== actual);
        await guardarProductos(`Elimino producto: ${actual.nombre}`);
        await borrarArchivo(actual.imagen);
      }
      cerrarEditor();
      renderLista();
      toast("Producto eliminado.");
    } catch (err) {
      if (err.status === 401) return salir(mensajeError(err));
      toast(mensajeError(err));
    } finally {
      ocupado(false);
    }
  }

  function salir(error) {
    token = "";
    productos = [];
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    cerrarEditor();
    mostrarLogin(error);
  }

  // ---------- Eventos ----------
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const valor = $("#tokenInput").value.trim();
    $("#tokenInput").value = "";
    if (valor) entrar(valor);
  });
  $("#logout").addEventListener("click", () => salir());
  $("#newProduct").addEventListener("click", () => abrirEditor(null));
  $("#list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-id]");
    if (row) abrirEditor(productos.find((p) => p.id === row.dataset.id));
  });
  $("#editorClose").addEventListener("click", cerrarEditor);
  $("#overlay").addEventListener("click", cerrarEditor);
  document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarEditor());
  $("#productForm").addEventListener("submit", guardar);
  $("#deleteBtn").addEventListener("click", eliminar);
  $("#photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      fotoNueva = await prepararFoto(file);
      $("#photoPreview").src = fotoNueva.dataUrl;
      $("#photoHint").textContent = "Cambiar foto";
    } catch {
      toast("No se pudo leer esa imagen. Prueba con otra (JPG o PNG).");
    }
  });

  // ---------- Inicio ----------
  $("#repoName").textContent = `${owner}/${repo}`;
  $("#categoria").innerHTML = Object.entries(CATEGORIAS)
    .map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("");

  let guardado = "";
  try { guardado = localStorage.getItem(TOKEN_KEY) || ""; } catch {}
  if (guardado) entrar(guardado);
  else mostrarLogin();
})();
