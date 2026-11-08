import Anthropic from "@anthropic-ai/sdk";
import { borrarConversacion, guardarConversacion, leerConversacion } from "./db.js";

const client = new Anthropic();
const MODELO = "claude-opus-5-5";

// Si una persona no escribe en 24 horas, la próxima conversación empieza de cero
const EXPIRA_MS = 24 * 60 * 60 * 1000;
const MAX_VUELTAS_HERRAMIENTAS = 5;

function obtenerConversacion(cliente, telefono) {
  const ahora = Date.now();
  let conv = leerConversacion(cliente.id, telefono);
  if (!conv || ahora - conv.ultimaActividad > EXPIRA_MS) {
    conv = { mensajes: [], costo: 0 };
  }
  conv.ultimaActividad = ahora;
  return conv;
}

// Precios de Claude Opus 5.5 en dólares por millón de tokens
const PRECIO = { entrada: 4, salida: 20, cacheLeida: 0.2, cacheEscrita: 5 };

function calcularCosto(uso) {
  return (
    ((uso.input_tokens ?? 0) * PRECIO.entrada +
      (uso.output_tokens ?? 0) * PRECIO.salida +
      (uso.cache_read_input_tokens ?? 0) * PRECIO.cacheLeida +
      (uso.cache_creation_input_tokens ?? 0) * PRECIO.cacheEscrita) /
    1_000_000
  );
}

export function costoConversacion(cliente, telefono) {
  return leerConversacion(cliente.id, telefono)?.costo ?? 0;
}

export function reiniciarConversacion(cliente, telefono) {
  borrarConversacion(cliente.id, telefono);
}

// La fecha va en el primer mensaje y no en el prompt del sistema,
// para que el prompt no cambie y se pueda reutilizar en caché
function conFechaDeHoy(contenido) {
  const hoy = new Date().toLocaleDateString("es-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const nota = { type: "text", text: `[Fecha de hoy en Miami: ${hoy}]` };
  const bloques = typeof contenido === "string" ? [{ type: "text", text: contenido }] : contenido;
  return [nota, ...bloques];
}

/**
 * Recibe el mensaje de una persona y devuelve la respuesta del bot de ese cliente.
 * `contenido` es un texto, o una lista de bloques (por ejemplo una foto + texto).
 * `alRegistrarCliente` se llama cuando la IA registra un caso.
 */
export async function responder(cliente, telefono, contenido, { alRegistrarCliente }) {
  const { perfil } = cliente;
  const conv = obtenerConversacion(cliente, telefono);
  const guardar = () => guardarConversacion(cliente.id, telefono, conv);

  const esPrimerMensaje = conv.mensajes.length === 0;
  conv.mensajes.push({ role: "user", content: esPrimerMensaje ? conFechaDeHoy(contenido) : contenido });
  guardar();

  for (let vuelta = 0; vuelta < MAX_VUELTAS_HERRAMIENTAS; vuelta++) {
    const respuesta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: perfil.prompt,
      tools: [perfil.herramienta],
      messages: conv.mensajes,
    });

    conv.costo += calcularCosto(respuesta.usage);
    console.log(`💲 [${cliente.id}] ${telefono}: conversación lleva $${conv.costo.toFixed(4)}`);

    if (respuesta.stop_reason === "refusal") {
      guardar();
      return "Disculpa, con eso no te puedo ayudar por aquí. Alguien de nuestro equipo te va a escribir pronto. 🙏";
    }

    // Se guarda la respuesta completa (incluye bloques internos que la IA necesita)
    conv.mensajes.push({ role: "assistant", content: respuesta.content });
    guardar();

    const usos = respuesta.content.filter((b) => b.type === "tool_use");
    if (respuesta.stop_reason !== "tool_use" || usos.length === 0) {
      return respuesta.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }

    const resultados = [];
    for (const uso of usos) {
      if (uso.name === perfil.herramienta.name) {
        try {
          await alRegistrarCliente({ telefono, ...uso.input });
          resultados.push({
            type: "tool_result",
            tool_use_id: uso.id,
            // Instrucciones para despedirse según la calificación
            content: perfil.cierres[uso.input.calificacion] ?? perfil.cierres.revisar,
          });
        } catch (error) {
          console.error("Error registrando caso:", error);
          resultados.push({
            type: "tool_result",
            tool_use_id: uso.id,
            content: "No se pudo registrar. Dile a la persona que alguien del equipo le escribirá pronto.",
            is_error: true,
          });
        }
      } else {
        resultados.push({
          type: "tool_result",
          tool_use_id: uso.id,
          content: `Herramienta desconocida: ${uso.name}`,
          is_error: true,
        });
      }
    }
    conv.mensajes.push({ role: "user", content: resultados });
    guardar();
  }

  return "Gracias por tu paciencia. Alguien de nuestro equipo te va a escribir pronto. 🙏";
}
