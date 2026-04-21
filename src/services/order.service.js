const orders = new Map();

export const createOrder = (controlNumber, data) => {
  if (!controlNumber || !data) return;

  orders.set(controlNumber, {
    ...data,
    createdAt: Date.now()
  });

  setTimeout(() => {
    orders.delete(controlNumber);
  }, 5 * 60 * 1000);
};

export const getOrder = (controlNumber) => {
  if (!controlNumber) return null;
  return orders.get(controlNumber) || null;
};

export const deleteOrder = (controlNumber) => {
  if (!controlNumber) return;
  orders.delete(controlNumber);
};