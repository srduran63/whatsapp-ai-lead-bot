// Funciones para hablar con WhatsApp. `cuenta` es el número de WhatsApp de cada cliente:
// { phoneNumberId, token }
const API = "https://graph.facebook.com/v25.0";

function cabeceras(cuenta) {
  return {
    Authorization: `Bearer ${cuenta.token}`,
    "Content-Type": "application/json",
  };
}

async function revisar(respuesta, accion) {
  if (!respuesta.ok) {
    throw new Error(`WhatsApp falló al ${accion} (${respuesta.status}): ${await respuesta.text()}`);
  }
  return respuesta;
}

export async function enviarTexto(cuenta, para, texto) {
  // WhatsApp acepta máximo 4096 caracteres por mensaje
  const body = texto.length > 4096 ? texto.slice(0, 4093) + "..." : texto;
  const respuesta = await fetch(`${API}/${cuenta.phoneNumberId}/messages`, {
    method: "POST",
    headers: cabeceras(cuenta),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body },
    }),
  });
  await revisar(respuesta, "enviar mensaje");
}

// Pone las dos palomitas azules en el mensaje del cliente
export async function marcarLeido(cuenta, idMensaje) {
  const respuesta = await fetch(`${API}/${cuenta.phoneNumberId}/messages`, {
    method: "POST",
    headers: cabeceras(cuenta),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: idMensaje,
    }),
  });
  await revisar(respuesta, "marcar como leído");
}

// Descarga una foto que mandó el cliente y la devuelve en base64
export async function descargarMedia(cuenta, idMedia) {
  const info = await revisar(
    await fetch(`${API}/${idMedia}`, { headers: cabeceras(cuenta) }),
    "obtener la foto",
  ).then((r) => r.json());

  const archivo = await revisar(
    await fetch(info.url, { headers: { Authorization: `Bearer ${cuenta.token}` } }),
    "descargar la foto",
  );
  const datos = Buffer.from(await archivo.arrayBuffer());
  return { base64: datos.toString("base64"), mimeType: info.mime_type };
}
