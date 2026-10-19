(() => {
  const STORAGE_KEY = "variete-carrito";
  const $ = (sel) => document.querySelector(sel);

  const formatPrice = (n) =>
    new Intl.NumberFormat(CONFIG.locale, {
      style: "currency",
      currency: CONFIG.moneda,
      maximumFractionDigits: 0,
    }).format(n);

  // Imagen genérica cuando el producto no tiene foto
  const placeholder = (categoria) => {
    const label = categoria === "3d" ? "3D" : "LÁSER";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#e8eef6'/><stop offset='1' stop-color='#c9d7ea'/></linearGradient></defs>
      <rect width='400' height='300' fill='url(#g)'/>
      <text x='200' y='170' font-family='Montserrat,Arial' font-weight='800' font-size='56'
        fill='#1d4370' fill-opacity='.35' text-anchor='middle'>${label}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  };
  const imgOf = (p) => (p.imagen ? esc(p.imagen) : placeholder(p.categoria));

  // Escapa texto antes de insertarlo en el HTML
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- Estado ----------
  let PRODUCTOS = [];
  let cart = {};
  let filtro = "todos";
  let busqueda = "";

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      // Descarta productos que ya no existen en el catálogo
      return Object.fromEntries(
        Object.entries(data).filter(([id]) => PRODUCTOS.some((p) => p.id === id))
      );
    } catch {
      return {};
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {}
  }

  // ---------- Catálogo ----------
  function renderFilters() {
    const opciones = { todos: "Todos", ...CATEGORIAS };
    $("#filters").innerHTML = Object.entries(opciones)
      .map(([key, label]) =>
        `<button class="chip" role="tab" data-filter="${key}" aria-selected="${key === filtro}">${label}</button>`)
      .join("");
  }

  function renderGrid() {
    const q = busqueda.trim().toLowerCase();
    const lista = PRODUCTOS.filter((p) =>
      (filtro === "todos" || p.categoria === filtro) &&
      (!q || (p.nombre + " " + p.descripcion).toLowerCase().includes(q))
    );
    $("#empty").hidden = lista.length > 0;
    $("#grid").innerHTML = lista
      .map((p) => `
        <article class="card">
          <div class="card-img">
            <img src="${imgOf(p)}" alt="${esc(p.nombre)}" loading="lazy">
            <span class="badge">${esc(CATEGORIAS[p.categoria] || p.categoria)}</span>
          </div>
          <div class="card-body">
            <h3>${esc(p.nombre)}</h3>
            <p>${esc(p.descripcion)}</p>
            <div class="card-foot">
              <span class="price">${formatPrice(p.precio)}</span>
              <button class="add-btn" data-add="${esc(p.id)}">Agregar</button>
            </div>
          </div>
        </article>`)
      .join("");
  }

  // ---------- Carrito ----------
  const items = () =>
    Object.entries(cart).map(([id, qty]) => ({ ...PRODUCTOS.find((p) => p.id === id), qty }));
  const total = () => items().reduce((s, it) => s + it.precio * it.qty, 0);
  const count = () => Object.values(cart).reduce((s, q) => s + q, 0);

  function add(id) {
    cart[id] = (cart[id] || 0) + 1;
    save();
    renderCart();
    const badge = $("#cartCount");
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
    toast(`${PRODUCTOS.find((p) => p.id === id).nombre} agregado`);
  }
  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = qty;
    save();
    renderCart();
  }

  function renderCart() {
    $("#cartCount").textContent = count();
    const lista = items();
    $("#cartItems").innerHTML = lista.length
      ? lista.map((it) => `
          <div class="cart-item">
            <img src="${imgOf(it)}" alt="">
            <div>
              <h4>${esc(it.nombre)}</h4>
              <small>${formatPrice(it.precio)} c/u</small>
              <div class="qty">
                <button data-dec="${esc(it.id)}" aria-label="Quitar uno">−</button>
                <span>${it.qty}</span>
                <button data-inc="${esc(it.id)}" aria-label="Agregar uno">+</button>
              </div>
            </div>
            <div class="item-total">
              ${formatPrice(it.precio * it.qty)}
              <button class="remove" data-remove="${esc(it.id)}">Eliminar</button>
            </div>
          </div>`).join("")
      : `<p class="cart-empty">Tu carrito está vacío.<br>¡Agrega productos del catálogo!</p>`;
    $("#cartTotal").textContent = formatPrice(total());
    $("#sendWa").disabled = lista.length === 0;
    $("#clearCart").hidden = lista.length === 0;
  }

  function openCart() {
    $("#cart").classList.add("open");
    $("#cart").setAttribute("aria-hidden", "false");
    $("#overlay").hidden = false;
    document.body.classList.add("no-scroll");
  }
  function closeCart() {
    $("#cart").classList.remove("open");
    $("#cart").setAttribute("aria-hidden", "true");
    $("#overlay").hidden = true;
    document.body.classList.remove("no-scroll");
  }

  // ---------- WhatsApp ----------
  function buildMessage() {
    const nombre = $("#customerName").value.trim();
    const notas = $("#customerNotes").value.trim();
    const lineas = [
      `¡Hola ${CONFIG.nombreTienda}! 👋 Quiero hacer este pedido:`,
      "",
      ...items().map((it) => `• ${it.qty} x ${it.nombre} — ${formatPrice(it.precio * it.qty)}`),
      "",
      `*Total: ${formatPrice(total())}*`,
    ];
    if (nombre) lineas.push("", `Nombre: ${nombre}`);
    if (notas) lineas.push(`Notas: ${notas}`);
    return lineas.join("\n");
  }

  function sendWhatsApp() {
    if (!count()) return;
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener");
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  // ---------- Eventos ----------
  $("#filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filtro = btn.dataset.filter;
    renderFilters();
    renderGrid();
  });
  $("#search").addEventListener("input", (e) => {
    busqueda = e.target.value;
    renderGrid();
  });
  $("#grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) add(btn.dataset.add);
  });
  $("#cartItems").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.inc) setQty(t.dataset.inc, cart[t.dataset.inc] + 1);
    if (t.dataset.dec) setQty(t.dataset.dec, cart[t.dataset.dec] - 1);
    if (t.dataset.remove) setQty(t.dataset.remove, 0);
  });
  $("#cartOpen").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());
  $("#sendWa").addEventListener("click", sendWhatsApp);
  $("#clearCart").addEventListener("click", () => {
    cart = {};
    save();
    renderCart();
  });

  // ---------- Inicio ----------
  $("#year").textContent = new Date().getFullYear();
  $("#footerWa").href = `https://wa.me/${CONFIG.whatsapp}`;
  renderFilters();
  renderCart();

  // ?v= evita que el navegador muestre una versión vieja del catálogo
  fetch(`data/productos.json?v=${Date.now()}`)
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((data) => {
      PRODUCTOS = data;
      cart = load();
      renderGrid();
      renderCart();
    })
    .catch(() => {
      $("#empty").textContent = "No pudimos cargar el catálogo. Intenta recargar la página.";
      $("#empty").hidden = false;
    });
})();
