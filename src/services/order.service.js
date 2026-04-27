const orders = new Map();

// ===============================
// CREAR ORDEN
// ===============================
export const createOrder = (reference3D, data) => {
  if (!reference3D || !data) return;

  orders.set(reference3D, {
    ...data,
    createdAt: Date.now()
  });

  // ⏱️ limpiar después (más seguro: 10 min)
  setTimeout(() => {
    if (orders.has(reference3D)) {
      orders.delete(reference3D);
      console.log("Orden expirada:", reference3D);
    }
  }, 10 * 60 * 1000);
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

  if (orders.has(reference3D)) {
    orders.delete(reference3D);
    console.log("Orden eliminada:", reference3D);
  }
};