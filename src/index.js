import crypto from "node:crypto";
import express from "express";
import { responder } from "./bot.js";
import { clientePorNumero, clientes } from "./clientes.js";
import { borrarConversacionesViejas } from "./db.js";
import { registrarYAvisar } from "./avisos.js";
import { descargarMedia, enviarTexto, marcarLeido } from "./whatsapp.js";

const app = express();

// Guardamos el cuerpo original para verificar la firma de Meta
app.use(express.json({ verify: (req, _res, buf) => (req.cuerpoOriginal = buf) }));

// Página web de la empresa: inicio, privacidad, términos y eliminación de datos
app.use(express.static("public", { extensions: ["html"] }));

// Meta llama aquí una sola vez para confirmar que el webhook es tuyo
app.get("/webhook", (req, res) => {
  const modo = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  if (modo === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

function firmaValida(req) {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) return true;
  const firma = req.get("x-hub-signature-256") ?? "";
  const esperada =
    "sha256=" + crypto.createHmac("sha256", secreto).update(req.cuerpoOriginal ?? "").digest("hex");
  return (
    firma.length === esperada.length &&
    crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))
  );
}

// Meta reintenta si tardamos; así no contestamos dos veces el mismo mensaje
const procesados = new Set();
// Una cola por cliente para contestar sus mensajes en orden
const colas = new Map();

function enCola(clave, tarea) {
  const anterior = colas.get(clave) ?? Promise.resolve();
  const siguiente = anterior.then(tarea).catch((error) => console.error("Error:", error));
  colas.set(clave, siguiente);
}

app.post("/webhook", (req, res) => {
  if (!firmaValida(req)) {
    console.warn("⚠️ Mensaje con firma inválida, ignorado");
    return res.sendStatus(401);
  }
  // Contestamos a Meta de inmediato y procesamos después
  res.sendStatus(200);

  for (const entrada of req.body.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const mensajes = cambio.value?.messages ?? [];
      if (mensajes.length === 0) continue;

      // Cada mensaje dice a qué número le escribieron; así sabemos de qué cliente es
      const numero = cambio.value.metadata?.phone_number_id;
      const cliente = clientePorNumero(numero);
      if (!cliente) {
        console.warn(`⚠️ Llegó un mensaje al número ${numero}, pero ningún cliente activo lo tiene`);
        continue;
      }
      for (const mensaje of mensajes) {
        if (procesados.has(mensaje.id)) continue;
        procesados.add(mensaje.id);
        enCola(`${cliente.id}:${mensaje.from}`, () => atender(cliente, mensaje));
      }
    }
  }
});

async function convertirMensaje(cliente, mensaje) {
  if (mensaje.type === "text") {
    return mensaje.text.body;
  }
  if (mensaje.type === "image") {
    const { base64, mimeType } = await descargarMedia(cliente.whatsapp, mensaje.image.id);
    return [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
      { type: "text", text: mensaje.image.caption || "(El cliente mandó esta foto)" },
    ];
  }
  return null;
}

async function atender(cliente, mensaje) {
  const telefono = mensaje.from;
  const cuenta = cliente.whatsapp;
  console.log(`📩 [${cliente.id}] ${telefono}: ${mensaje.type === "text" ? mensaje.text.body : `[${mensaje.type}]`}`);
  marcarLeido(cuenta, mensaje.id).catch(() => {});

  const contenido = await convertirMensaje(cliente, mensaje);
  if (!contenido) {
    await enviarTexto(
      cuenta,
      telefono,
      "Por ahora solo puedo leer mensajes de texto y fotos 📸. ¿Me lo puedes escribir?",
    );
    return;
  }

  const texto = await responder(cliente, telefono, contenido, {
    alRegistrarCliente: (caso) => registrarYAvisar(cliente, caso),
  });
  if (texto) {
    await enviarTexto(cuenta, telefono, texto);
    console.log(`🤖 [${cliente.id}] → ${telefono}: ${texto}`);
  }
}

// Borra las conversaciones de más de 90 días (lo promete la política de privacidad)
function limpiar() {
  const borradas = borrarConversacionesViejas(90);
  if (borradas > 0) console.log(`🧹 Se borraron ${borradas} conversaciones de más de 90 días`);
}
limpiar();
setInterval(limpiar, 24 * 60 * 60 * 1000);

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
  console.log(`🚀 Bot escuchando en http://localhost:${puerto}`);
  for (const c of clientes) {
    console.log(`   ${c.activo ? "🟢" : "⚪"} ${c.id} (${c.nombrePerfil}) → número ${c.whatsapp.phoneNumberId}`);
  }
});
