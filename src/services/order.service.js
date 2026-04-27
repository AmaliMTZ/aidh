const orders = new Map();

// ===============================
// CREAR ORDEN
// ===============================
export const createOrder = (reference3D, data) => {
  if (!reference3D || typeof reference3D !== "string") return;
  if (!data || typeof data !== "object") return;

  orders.set(reference3D, {
    ...data,
    createdAt: Date.now()
  });

  // ⏱️ eliminar después de 10 min
  const timeout = setTimeout(() => {
    if (orders.has(reference3D)) {
      orders.delete(reference3D);
      console.log("Orden expirada:", reference3D);
    }
  }, 10 * 60 * 1000);

  // opcional: guardar timeout si quisieras cancelarlo después
};


// ===============================
// OBTENER ORDEN
// ===============================
export const getOrder = (reference3D) => {
  if (!reference3D) return null;

  const order = orders.get(reference3D);

  if (!order) {
    console.warn("Orden no encontrada:", reference3D);
    return null;
  }

  return order;
};


// ===============================
// ELIMINAR ORDEN
// ===============================
export const deleteOrder = (reference3D) => {
  if (!reference3D) return;

  if (orders.delete(reference3D)) {
    console.log("Orden eliminada:", reference3D);
  }
};