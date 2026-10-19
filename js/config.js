// ============================================================
//  CONFIGURACIÓN DE LA TIENDA  (variables de entorno del sitio)
//  Este es el ÚNICO lugar donde se cambian estos datos.
// ============================================================
const CONFIG = {
  nombreTienda: "Varieté",

  // WhatsApp de la empresa: aquí llegan los pedidos del carrito.
  // Formato internacional, SOLO dígitos (sin "+", espacios ni guiones).
  // Uruguay: 598 + número sin el 0 inicial.
  whatsapp: "59897619870",

  // Moneda y formato de precios (Uruguay)
  moneda: "UYU",
  locale: "es-UY",

  instagram: "", // ej: "https://instagram.com/variete"

  // Repositorio de GitHub donde el panel /admin guarda los productos
  github: {
    owner: "taniablopez86",
    repo: "variete",
    branch: "main",
  },
};

// Categorías del catálogo (clave: nombre visible)
const CATEGORIAS = {
  laser: "Corte y grabado láser",
  "3d": "Impresión 3D",
};
