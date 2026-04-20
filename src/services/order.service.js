const orders = new Map();

// Crear orden
export const createOrder = (controlNumber, data) => {
  orders.set(controlNumber, data);

  // 🔥 auto borrar en 5 min
  setTimeout(() => {
    orders.delete(controlNumber);
  }, 5 * 60 * 1000);
};

// Obtener orden
export const getOrder = (controlNumber) => {
  return orders.get(controlNumber);
};

// Eliminar orden
export const deleteOrder = (controlNumber) => {
  orders.delete(controlNumber);
};