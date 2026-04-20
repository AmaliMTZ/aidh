const orders = new Map();

// Crear orden
export const createOrder = (data) => {
  const controlNumber = "ORD" + Date.now();

  orders.set(controlNumber, {
    ...data,
    status: "pending"
  });

  return controlNumber;
};

// Obtener orden
export const getOrder = (controlNumber) => {
  return orders.get(controlNumber);
};

// Actualizar orden
export const updateOrder = (controlNumber, updates) => {
  const order = orders.get(controlNumber);

  if (!order) return null;

  const updated = { ...order, ...updates };
  orders.set(controlNumber, updated);

  return updated;
};