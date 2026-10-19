// ============================================================
//  CATÁLOGO DE PRODUCTOS
//  Para agregar un producto, copia un bloque { ... } y cambia sus datos.
//  - id: único, sin espacios
//  - categoria: "laser" o "3d"
//  - imagen: ruta a la foto (ej: "img/productos/llavero.jpg").
//            Si se deja vacío se muestra una imagen genérica.
//  - precio: número sin puntos ni símbolos
// ============================================================
const PRODUCTOS = [
  {
    id: "caja-mdf-personalizada",
    nombre: "Caja de MDF personalizada",
    categoria: "laser",
    descripcion: "Caja grabada con nombre o mensaje. Ideal para regalos y recordatorios.",
    precio: 350,
    imagen: "",
  },
  {
    id: "letrero-acrilico",
    nombre: "Letrero en acrílico",
    categoria: "laser",
    descripcion: "Letrero cortado en acrílico para negocios, eventos o decoración.",
    precio: 600,
    imagen: "",
  },
  {
    id: "llaveros-grabados",
    nombre: "Llaveros grabados (x10)",
    categoria: "laser",
    descripcion: "Paquete de 10 llaveros en madera con grabado personalizado.",
    precio: 250,
    imagen: "",
  },
  {
    id: "topper-torta",
    nombre: "Topper para torta",
    categoria: "laser",
    descripcion: "Topper cortado en acrílico espejo o MDF con el diseño que quieras.",
    precio: 180,
    imagen: "",
  },
  {
    id: "figura-3d",
    nombre: "Figura decorativa 3D",
    categoria: "3d",
    descripcion: "Figura impresa en PLA, disponible en varios colores y tamaños.",
    precio: 400,
    imagen: "",
  },
  {
    id: "maceta-3d",
    nombre: "Maceta geométrica",
    categoria: "3d",
    descripcion: "Maceta de diseño geométrico impresa en 3D, perfecta para suculentas.",
    precio: 280,
    imagen: "",
  },
  {
    id: "soporte-celular",
    nombre: "Soporte para celular",
    categoria: "3d",
    descripcion: "Soporte ergonómico para escritorio, compatible con la mayoría de celulares.",
    precio: 220,
    imagen: "",
  },
  {
    id: "lampara-litofania",
    nombre: "Lámpara litofanía",
    categoria: "3d",
    descripcion: "Lámpara con tu foto favorita que se revela al encenderla.",
    precio: 850,
    imagen: "",
  },
];

const CATEGORIAS = {
  laser: "Corte y grabado láser",
  "3d": "Impresión 3D",
};
