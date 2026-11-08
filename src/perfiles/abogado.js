// Perfil: bufete de abogados de accidentes. El bot va en el número del bufete
// y atiende a personas que les escriben. Cambia los datos de `negocio` y los
// `criterios` para cada bufete. (Estos son datos de ejemplo para el demo.)
import { camposCalificacion, encabezadoCalificacion, textoCriterios } from "./calificacion.js";

const negocioDemo = {
  nombre: "Bufete Demo Accidentes Miami",
  direccion: "123 Demo Ave, Miami, FL 33130",
  telefono: "(305) 555-0199",
  horario: "Atendemos por WhatsApp 24/7. Oficina: lunes a viernes 9:00am - 6:00pm",
  areas: "Accidentes de auto, moto, camión, Uber/Lyft y peatones",
  costo: "La consulta es gratis. Si el bufete toma el caso, no se cobra nada a menos que se gane.",
  idiomas: "Español e inglés",
};

// Criterios de ejemplo. Cada cliente puede poner los suyos en su archivo.
const criteriosDemo = {
  califica: [
    "El accidente fue en Florida",
    "Pasó hace 14 días o menos",
    "La persona tiene lesiones o dolor por el accidente",
    "La persona no causó el accidente (fue el otro conductor, o la culpa no está clara)",
    "Todavía no tiene abogado para este accidente",
  ],
  noCalifica: [
    "Pasó hace más de 30 días",
    "No tuvo ninguna lesión ni dolor (solo daños al carro)",
    "La persona claramente causó el accidente (por ejemplo, a ella le dieron la multa)",
    "Ya tiene abogado para este accidente",
    "El accidente fue fuera de Florida",
    "No es un accidente de tránsito",
  ],
  revisar: [
    "Pasó entre 15 y 30 días atrás",
    "No sabe la fecha, o no queda claro quién tuvo la culpa y faltan datos",
    "La persona no quiso responder preguntas importantes",
  ],
};

// Qué le dice el bot a la persona al final, según su calificación
const cierres = {
  califica:
    "Caso registrado y enviado al abogado. Dile que un abogado va a revisar su caso y lo va a contactar " +
    "en el horario que pidió, que la consulta es gratis, y aclara una vez que esta conversación no crea " +
    "una relación abogado-cliente hasta que el bufete acepte el caso.",
  revisar:
    "Caso registrado para revisión. Dile que un abogado va a revisar su información y, si puede ayudarle, " +
    "lo va a contactar. Aclara una vez que esta conversación no crea una relación abogado-cliente.",
  no_califica:
    "Caso registrado. No le prometas que lo van a llamar. Agradécele con amabilidad y dile que, por la " +
    "información que dio, parece que no es un caso que el bufete pueda tomar en este momento. No le digas " +
    "que no tiene caso ni le des razones legales. Si se trata de un accidente con lesiones, recomiéndale " +
    "consultar pronto con otro abogado porque existen plazos legales. Despídete deseándole lo mejor.",
};

function construirPromptSistema(negocio, criterios) {
  return `Eres el asistente de WhatsApp de ${negocio.nombre}, un bufete de abogados de accidentes en Miami, Florida.

DATOS DEL BUFETE
- Dirección: ${negocio.direccion}
- Teléfono: ${negocio.telefono}
- Horario: ${negocio.horario}
- Casos: ${negocio.areas}
- Costo: ${negocio.costo}
- Idiomas: ${negocio.idiomas}

TU TRABAJO
Atender a personas que escriben al bufete después de un accidente, hacerles las preguntas en orden, evaluar si su caso califica y registrarlo. Tú no eres abogado.

CÓMO ESCRIBIR
- Contesta en el idioma de la persona (español o inglés).
- Mensajes cortos, como en WhatsApp. UNA pregunta a la vez.
- Tono cálido y tranquilo: la persona acaba de pasar por algo difícil.
- Texto simple. Para resaltar usa *asteriscos simples*, no uses markdown con # ni **.

PRIMERO
Pregunta si todos están bien. Si alguien está herido de gravedad, dile que llame al 911 de inmediato.

PREGUNTAS, EN ESTE ORDEN
Hazlas una por una. Si la persona ya respondió alguna por su cuenta, sáltala.
1. ¿Tienes seguro de auto? ¿Cuál? (y si sabe, el seguro del otro conductor)
2. ¿Sufriste lesiones o dolor a raíz del accidente?
3. ¿Qué lesiones o molestias tienes? ¿Ya te vio un médico? (si dijo que no tiene lesiones, sáltala)
4. ¿Cómo fue el accidente?
5. ¿Hace cuánto pasó? (pide la fecha aproximada)
6. ¿Quién crees que causó el accidente? ¿Le dieron multa a alguien?
7. ¿Hubo reporte de policía?
8. ¿Dónde fue el accidente? (ciudad, calle o intersección)
9. ¿Ya tienes un abogado para este accidente?
10. Su nombre y el mejor horario para que un abogado lo llame. (Si ya está claro que no califica, pide solo el nombre.)

Cuando tengas las respuestas (o la persona no quiera dar más datos), califica el caso y usa la herramienta registrar_cliente. Después sigue las instrucciones que te devuelva la herramienta para despedirte.

${textoCriterios(criterios)}

INFORMACIÓN ÚTIL QUE PUEDES DAR
- Si tiene lesiones y no ha visto a un médico: recomiéndale que lo haga pronto. En Florida, para usar el seguro PIP normalmente hay que recibir atención médica dentro de los 14 días después del accidente.
- Recomiéndale guardar fotos, el reporte de policía, recibos médicos y los datos del otro conductor.
- La consulta es gratis.

REGLAS IMPORTANTES
- No des asesoría legal. No digas si tiene caso o no, ni cuánto dinero podría recibir, ni quién tuvo la culpa. Eso lo evalúa el abogado.
- No des consejos médicos más allá de recomendar ver a un médico.
- No inventes datos del bufete que no estén arriba.
- Si la persona pide hablar con un abogado ya, registra lo que tengas (normalmente como "revisar") y dile que un abogado la va a contactar si puede ayudarle.`;
}

const herramienta = {
  name: "registrar_cliente",
  description:
    "Registra un caso de accidente con su calificación. Si califica, se le avisa al bufete. " +
    "Úsala cuando hayas hecho las preguntas (o la persona no quiera dar más datos). " +
    'Para cualquier dato que la persona no haya dado, escribe "no indicado".',
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "calificacion",
      "motivo",
      "nombre",
      "seguro",
      "lesiones",
      "atencion_medica",
      "como_fue",
      "fecha_accidente",
      "dias_desde_accidente",
      "culpa",
      "reporte_policia",
      "lugar",
      "tiene_abogado",
      "horario_llamada",
      "resumen",
    ],
    properties: {
      ...camposCalificacion,
      nombre: { type: "string", description: "Nombre de la persona" },
      seguro: { type: "string", description: "Su seguro de auto y, si lo sabe, el del otro conductor" },
      lesiones: { type: "string", description: 'Lesiones o dolor que reporta, o "ninguna"' },
      atencion_medica: { type: "string", description: "Si ya lo vio un médico, dónde y cuándo" },
      como_fue: { type: "string", description: "Cómo pasó el accidente, en sus palabras" },
      fecha_accidente: { type: "string", description: "Fecha aproximada del accidente" },
      dias_desde_accidente: {
        type: "integer",
        description: "Días aproximados desde el accidente hasta hoy. Usa -1 si no se sabe.",
      },
      culpa: { type: "string", description: "Quién cree la persona que causó el accidente y si hubo multa" },
      reporte_policia: { type: "string", description: '"sí", "no" o "no indicado", con número si lo dio' },
      lugar: { type: "string", description: "Ciudad, calle o intersección" },
      tiene_abogado: { type: "string", description: '"sí", "no" o "no indicado"' },
      horario_llamada: { type: "string", description: "Mejor horario para que la llame un abogado" },
      resumen: { type: "string", description: "Resumen de 2-3 oraciones del caso para el abogado" },
    },
  },
};

function tiempo(dias) {
  if (dias < 0) return "⚪ Fecha desconocida";
  if (dias <= 14) return `🟢 Hace ${dias} días (dentro de 14)`;
  if (dias <= 30) return `🟡 Hace ${dias} días (15 a 30)`;
  return `🔴 Hace ${dias} días (más de 30)`;
}

function formatearAviso(caso) {
  return [
    "⚖️ *NUEVO CASO DE ACCIDENTE*",
    encabezadoCalificacion(caso),
    "",
    `👤 ${caso.nombre}`,
    `📱 +${caso.telefono}`,
    `📞 Llamar: ${caso.horario_llamada}`,
    "",
    `⏱️ ${tiempo(caso.dias_desde_accidente)}`,
    `📅 Fecha: ${caso.fecha_accidente}`,
    `🛡️ Seguro: ${caso.seguro}`,
    `🤕 Lesiones: ${caso.lesiones}`,
    `🏥 Médico: ${caso.atencion_medica}`,
    `💥 Cómo fue: ${caso.como_fue}`,
    `⚖️ Culpa: ${caso.culpa}`,
    `🚓 Reporte policía: ${caso.reporte_policia}`,
    `📍 Lugar: ${caso.lugar}`,
    `👨‍⚖️ ¿Ya tiene abogado?: ${caso.tiene_abogado}`,
    "",
    caso.resumen,
  ].join("\n");
}

// Crea el perfil de un cliente. Lo que venga en su archivo (negocio, criterios)
// reemplaza los datos de ejemplo.
export function crearPerfil(config = {}) {
  const negocio = { ...negocioDemo, ...config.negocio };
  const criterios = { ...criteriosDemo, ...config.criterios };
  return {
    prompt: construirPromptSistema(negocio, criterios),
    herramienta,
    formatearAviso,
    cierres,
  };
}
