const orders = new Map();


// ===============================
// CREAR ORDEN
// ===============================
export const createOrder = (
  reference3D,
  data
) => {

  if (
    !reference3D ||
    typeof reference3D !== "string"
  ) {
    console.warn(
      "Referencia inválida al crear orden"
    );
    return;
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    console.warn(
      "Data inválida al crear orden"
    );
    return;
  }

  // ✅ EVITAR DUPLICADOS
  if (orders.has(reference3D)) {

    const oldOrder =
      orders.get(reference3D);

    if (oldOrder?.timeout) {
      clearTimeout(oldOrder.timeout);
    }

    orders.delete(reference3D);
  }

  // ✅ EXPIRACIÓN AUTOMÁTICA
  const timeout = setTimeout(() => {

    if (orders.has(reference3D)) {

      orders.delete(reference3D);

      console.log(
        "Orden expirada:",
        reference3D
      );
    }

  }, 10 * 60 * 1000);

  // ✅ GUARDAR
  orders.set(reference3D, {

    ...data,

    createdAt: Date.now(),

    timeout
  });

  console.log(
    "Orden creada:",
    reference3D
  );
};


// ===============================
// OBTENER ORDEN
// ===============================
export const getOrder = (
  reference3D
) => {

  if (!reference3D) {

    console.warn(
      "Referencia vacía al buscar orden"
    );

    return null;
  }

  const order =
    orders.get(reference3D);

  if (!order) {

    console.warn(
      "Orden no encontrada:",
      reference3D
    );

    return null;
  }

  // ✅ VALIDAR EXPIRACIÓN
  const isExpired =
    Date.now() - order.createdAt >
    10 * 60 * 1000;

  if (isExpired) {

    if (order.timeout) {
      clearTimeout(order.timeout);
    }

    orders.delete(reference3D);

    console.warn(
      "Orden expirada al leer:",
      reference3D
    );

    return null;
  }

  console.log(
    "Orden obtenida:",
    reference3D
  );

  return order;
};


// ===============================
// ELIMINAR ORDEN
// ===============================
export const deleteOrder = (
  reference3D
) => {

  if (!reference3D) {

    console.warn(
      "Referencia vacía al eliminar orden"
    );

    return;
  }

  const order =
    orders.get(reference3D);

  // ✅ LIMPIAR TIMEOUT
  if (order?.timeout) {
    clearTimeout(order.timeout);
  }

  // ✅ ELIMINAR
  if (orders.delete(reference3D)) {

    console.log(
      "Orden eliminada:",
      reference3D
    );

  } else {

    console.warn(
      "No se pudo eliminar la orden:",
      reference3D
    );
  }
};


// ===============================
// DEBUG OPCIONAL
// ===============================
export const getAllOrders = () => {

  return Array.from(
    orders.entries()
  );
};
