const orders = new Map();

//  Crear orden
export const createOrder = (controlNumber, data) => {
  if (!controlNumber || !data) return;

  orders.set(controlNumber, {
    ...data,
    createdAt: Date.now()
  });

  //  auto eliminar en 5 minutos
  setTimeout(() => {
    orders.delete(controlNumber);
  }, 5 * 60 * 1000);
};


//  Obtener orden
export const getOrder = (controlNumber) => {
  if (!controlNumber) return null;

  const order = orders.get(controlNumber);

  if (!order) return null;

  return order;
};


//  Eliminar orden
export const deleteOrder = (controlNumber) => {
  if (!controlNumber) return;

  orders.delete(controlNumber);
};