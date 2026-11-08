// Perfil: taller de colisión. Para cada cliente nuevo, cambias los datos de `negocio`
// y los `criterios`. (Estos son datos de ejemplo para el demo.)
import { camposCalificacion, encabezadoCalificacion, textoCriterios } from "./calificacion.js";

const negocioDemo = {
  nombre: "Demo Collision Center",
  direccion: "456 Demo St, Miami, FL 33142",
  telefono: "(305) 555-0100",
  horario: "Lunes a viernes 8:00am - 6:00pm, sábados 9:00am - 2:00pm, domingos cerrado",
  servicios: [
    "Reparación de colisión y carrocería",
    "Pintura (igualamos el color de fábrica)",
    "Enderezado de chasis",
    "Reparación de abolladuras sin pintura (PDR)",
    "Cambio de parabrisas y vidrios",
    "Estimados gratis",
  ],
  seguros:
    "Trabajamos con todas las aseguradoras (GEICO, Progressive, State Farm, Allstate, USAA, etc.) y también con clientes que pagan por su cuenta.",
  grua: "Podemos coordinar grúa si el carro no se puede manejar.",
  carroRenta: "Ayudamos a coordinar carro de renta si tu seguro lo cubre.",
  garantia: "Garantía de por vida en pintura y trabajos de carrocería mientras seas el dueño del carro.",
  idiomas: "Español e inglés",
};

// Criterios de ejemplo. Cada cliente puede poner los suyos en su archivo.
const criteriosDemo = {
  califica: [
    "Su carro tiene daños de choque o carrocería que el taller repara (ver servicios)",
    "Vive o puede traer el carro al área de Miami",
    "Quiere un estimado o agendar una cita",
  ],
  noCalifica: [
    "Solo necesita mecánica (motor, frenos, transmisión, aire acondicionado, cambio de aceite) y no carrocería",
    "Está fuera del área de Miami y no puede traer el carro",
    "Solo quiere un precio exacto por mensaje y no quiere estimado en persona ni por fotos",
    "Está vendiendo algo, buscando empleo o escribió por otro tema",
  ],
  revisar: [
    "No queda claro qué tipo de daño tiene",
    "No quiso dar sus datos o el día para traer el carro",
  ],
};

// Qué le dice el bot a la persona al final, según su calificación
const cierres = {
  califica:
    "Cliente registrado y enviado al taller. Confírmale que el equipo del taller le va a escribir para confirmar la cita.",
  revisar:
    "Cliente registrado para revisión. Dile que alguien del taller va a revisar su mensaje y le va a escribir.",
  no_califica:
    "Cliente registrado. Agradécele con amabilidad y explícale que ese servicio no es algo que el taller haga " +
    "(o que no le podemos ayudar con eso). Si aplica, sugiérele buscar un taller mecánico. Despídete deseándole lo mejor.",
};

function construirPromptSistema(negocio, criterios) {
  return `Eres el asistente de WhatsApp de ${negocio.nombre}, un taller de colisión y carrocería en Miami.

DATOS DEL TALLER
- Dirección: ${negocio.direccion}
- Teléfono: ${negocio.telefono}
- Horario: ${negocio.horario}
- Servicios: ${negocio.servicios.join("; ")}
- Seguros: ${negocio.seguros}
- Grúa: ${negocio.grua}
- Carro de renta: ${negocio.carroRenta}
- Garantía: ${negocio.garantia}
- Idiomas: ${negocio.idiomas}

TU TRABAJO
Atender a personas que tuvieron un choque o necesitan reparar su carro, resolver sus dudas y conseguir que agenden una inspección o estimado gratis.

CÓMO ESCRIBIR
- Contesta en el idioma del cliente (español o inglés).
- Mensajes cortos, como en WhatsApp: 1 a 4 oraciones. Una o dos preguntas a la vez, nunca un formulario largo.
- Tono amable, cercano y profesional. Puedes usar algún emoji, sin exagerar.
- Texto simple. Para resaltar usa *asteriscos simples* (formato de WhatsApp), no uses markdown con # ni **.

DATOS QUE NECESITAS CONSEGUIR (de forma natural, durante la conversación)
1. Nombre del cliente
2. Vehículo: marca, modelo y año
3. Qué le pasó y dónde está el daño (pide fotos del daño si no las ha mandado)
4. Si va por seguro (cuál aseguradora y número de claim si ya lo tiene) o paga por su cuenta
5. Si el carro se puede manejar o necesita grúa
6. Qué día y hora prefiere para traer el carro

Cuando tengas al menos el nombre, el vehículo, el daño y el día preferido (o esté claro que no es un cliente para el taller), califícalo y usa la herramienta registrar_cliente. Después sigue las instrucciones que te devuelva la herramienta para despedirte.

${textoCriterios(criterios)}

SI MANDA FOTOS
Describe brevemente lo que ves (zona dañada, qué piezas parecen afectadas) para que sienta que lo entendiste. Aclara que el estimado exacto se hace en persona.

SI EL CHOQUE ACABA DE PASAR
- Primero pregunta si todos están bien. Si hay heridos, dile que llame al 911 de inmediato.
- Recomienda: moverse a un lugar seguro, llamar a la policía para el reporte, tomar fotos de los carros y la escena, e intercambiar datos de seguro y licencia con el otro conductor.

REGLAS IMPORTANTES
- Nunca des precios exactos ni rangos de precio de reparación. Di que el estimado es gratis y se hace en persona o con fotos por un técnico.
- Nunca prometas lo que va a cubrir un seguro, ni quién tuvo la culpa.
- No des consejos legales ni médicos. Si preguntan por abogados o lesiones, di que eso lo deben consultar con un profesional.
- No inventes datos del taller que no estén arriba. Si no sabes algo, di que alguien del equipo le va a confirmar.
- Si el cliente está molesto o pide hablar con una persona, discúlpate y dile que alguien del taller le va a escribir pronto (y registra sus datos si los tienes).`;
}

const herramienta = {
  name: "registrar_cliente",
  description:
    "Registra a un cliente con su calificación. Si califica, se le avisa al dueño del taller. " +
    "Úsala cuando ya tengas nombre, vehículo, daño y día preferido, o esté claro que no califica. " +
    'Para cualquier dato que el cliente no haya dado, escribe "no indicado".',
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "calificacion",
      "motivo",
      "nombre",
      "vehiculo",
      "dano",
      "seguro",
      "numero_claim",
      "se_puede_manejar",
      "cita_preferida",
      "resumen",
    ],
    properties: {
      ...camposCalificacion,
      nombre: { type: "string", description: "Nombre del cliente" },
      vehiculo: { type: "string", description: "Marca, modelo y año" },
      dano: { type: "string", description: "Qué pasó y dónde está el daño" },
      seguro: { type: "string", description: 'Aseguradora, o "paga por su cuenta"' },
      numero_claim: { type: "string", description: "Número de claim del seguro" },
      se_puede_manejar: { type: "string", description: '"sí", "no, necesita grúa" o "no indicado"' },
      cita_preferida: { type: "string", description: "Día y hora que prefiere el cliente" },
      resumen: { type: "string", description: "Resumen de 1-2 oraciones para el dueño del taller" },
    },
  },
};

function formatearAviso(cliente) {
  return [
    "🚗 *NUEVO CLIENTE*",
    encabezadoCalificacion(cliente),
    "",
    `👤 ${cliente.nombre}`,
    `📱 +${cliente.telefono}`,
    `🚙 ${cliente.vehiculo}`,
    `💥 ${cliente.dano}`,
    `🛡️ Seguro: ${cliente.seguro} | Claim: ${cliente.numero_claim}`,
    `🔧 ¿Se maneja?: ${cliente.se_puede_manejar}`,
    `📅 Cita preferida: ${cliente.cita_preferida}`,
    "",
    cliente.resumen,
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
