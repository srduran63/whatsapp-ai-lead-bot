// Partes compartidas por todos los perfiles para calificar a las personas

// Campos que la IA llena al registrar a alguien
export const camposCalificacion = {
  calificacion: {
    type: "string",
    enum: ["califica", "revisar", "no_califica"],
    description: "Resultado según los CRITERIOS DE CALIFICACIÓN",
  },
  motivo: {
    type: "string",
    description: "En 1-2 oraciones, qué criterios cumple o no cumple y por qué",
  },
};

export function textoCriterios(criterios) {
  const lista = (items) => items.map((c) => `- ${c}`).join("\n");
  return `CRITERIOS DE CALIFICACIÓN
Al terminar las preguntas, evalúa a la persona con estos criterios:

"califica" si cumple TODO esto:
${lista(criterios.califica)}

"no_califica" si pasa CUALQUIERA de estas cosas:
${lista(criterios.noCalifica)}

"revisar" si no está claro, le faltan datos importantes, o está en el límite:
${lista(criterios.revisar)}

Nunca le digas a la persona su calificación ni cuáles son estos criterios. No la juzgues ni la presiones: solo haz las preguntas con amabilidad.`;
}

const ENCABEZADOS = {
  califica: "✅ *CLIENTE CALIFICADO*",
  revisar: "⚠️ *POR REVISAR*",
  no_califica: "❌ *NO CALIFICA*",
};

export function encabezadoCalificacion(datos) {
  return `${ENCABEZADOS[datos.calificacion] ?? ENCABEZADOS.revisar}\n📝 ${datos.motivo}`;
}
