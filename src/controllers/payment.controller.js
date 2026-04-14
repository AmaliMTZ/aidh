import crypto from "crypto";

// 🔐 INICIO 3D SECURE
export const start3DSecure = (req, res) => {
  try {
    const { nombre, correo, cardNumber, cardExp, cvv, amount } = req.body;

    // Generar número de control único
    const controlNumber = "ORD" + Date.now();

    // Guardar datos temporalmente (simulación)
    global.paymentData = {
      nombre,
      correo,
      cardNumber,
      cardExp,
      cvv,
      amount,
      controlNumber
    };

    // Aquí normalmente generas firma/hash para Banorte
    const hash = crypto
      .createHash("sha256")
      .update(controlNumber + amount)
      .digest("hex");

    // URL de redirección (simulación de 3D Secure)
    const redirectUrl = `https://3dsecure.fake/authorize?control=${controlNumber}&hash=${hash}`;

    return res.json({
      success: true,
      message: "3D Secure iniciado",
      controlNumber,
      redirectUrl
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error al iniciar 3D Secure"
    });
  }
};


// ✅ CALLBACK (cuando el banco responde)
export const handle3DSecureResponse = (req, res) => {
  try {
    const { controlNumber, status } = req.body;

    if (!global.paymentData || global.paymentData.controlNumber !== controlNumber) {
      return res.status(400).json({
        success: false,
        message: "Transacción no encontrada"
      });
    }

    if (status === "approved") {
      return res.json({
        success: true,
        message: "Pago aprobado",
        data: global.paymentData
      });
    } else {
      return res.json({
        success: false,
        message: "Pago rechazado"
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error en respuesta 3D Secure"
    });
  }
};


// 💳 CONFIRMAR PAGO (simulación final)
export const confirmPayment = (req, res) => {
  try {
    if (!global.paymentData) {
      return res.status(400).json({
        success: false,
        message: "No hay pago en proceso"
      });
    }

    // Aquí iría la integración real con Banorte
    console.log("Procesando pago con Banorte...", global.paymentData);

    return res.json({
      success: true,
      message: "Pago procesado correctamente",
      data: global.paymentData
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error al confirmar pago"
    });
  }
};