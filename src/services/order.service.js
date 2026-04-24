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

  // eliminar en 5 minutos
  setTimeout(() => {
    orders.delete(reference3D);
  }, 5 * 60 * 1000);
};


// ===============================
// OBTENER ORDEN
// ===============================
export const getOrder = (reference3D) => {
  if (!reference3D) return null;
  return orders.get(reference3D) || null;
};


// ===============================
// ELIMINAR ORDEN
// ===============================
export const deleteOrder = (reference3D) => {
  if (!reference3D) return;
  orders.delete(reference3D);
};