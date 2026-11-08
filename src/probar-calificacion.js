// Simula varias personas para revisar que el bot de un cliente las califica bien:
//   npm run probar                  (usa el primer cliente)
//   npm run probar -- demo-taller   (elige el cliente por su id)
import { costoConversacion, reiniciarConversacion, responder } from "./bot.js";
import { debeAvisar } from "./avisos.js";
import { clientePorId, clientes } from "./clientes.js";

const cliente = clientePorId(process.argv[2] ?? clientes[0].id);
if (!cliente) {
  console.error(`No existe ese cliente. Clientes: ${clientes.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const casos = {
  abogado: [
    {
      esperado: "califica",
      mensajes: [
        "Hola, tuve un accidente hace 5 días, estoy bien pero me duele mucho la espalda",
        "Tengo GEICO. Me duele la espalda baja y el cuello, fui a urgencias al otro día",
        "Estaba parado en un semáforo en Hialeah y un camión me chocó por detrás. Al camionero le dieron la multa y la policía hizo reporte",
        "No tengo abogado. Me llamo Ana Torres, llámenme en la mañana",
      ],
    },
    {
      esperado: "no_califica",
      mensajes: [
        "Hola, choqué hace como 2 meses en Doral",
        "Tengo Progressive. No me pasó nada, solo se dañó el carro",
        "Me pasé una luz roja y le pegué a otro carro, a mí me dieron la multa. Hubo reporte. No tengo abogado. Me llamo Luis",
      ],
    },
    {
      esperado: "revisar",
      mensajes: [
        "Hola, tuve un choque hace unas 3 semanas en Kendall",
        "Tengo State Farm. Me duele el hombro desde el choque, no he ido al médico",
        "Cambiamos de carril los dos al mismo tiempo, no sé quién tuvo la culpa, no dieron multa. Sí hubo reporte",
        "No tengo abogado. Me llamo Pedro Ruiz, después de las 6pm",
        "No me acuerdo bien del día, fue hace como 3 semanas",
      ],
    },
  ],
  taller: [
    {
      esperado: "califica",
      mensajes: [
        "Hola, me chocaron por atrás, tengo un Honda Civic 2021, la defensa está hundida",
        "Me llamo María, voy por Allstate, el carro sí se maneja. Puedo ir el jueves en la tarde",
      ],
    },
    {
      esperado: "no_califica",
      mensajes: [
        "Hola, ¿ustedes cambian el aceite y revisan frenos? Tengo un Corolla 2018, me llamo Juan",
        "No, el carro está bien, solo necesito el aceite y los frenos",
      ],
    },
  ],
};

let aciertos = 0;
let costoTotal = 0;
const lista = casos[cliente.nombrePerfil];
for (const [i, caso] of lista.entries()) {
  console.log(`\n========== Persona ${i + 1} (se espera: ${caso.esperado}) ==========`);
  let resultado = "no se registró";
  const telefono = `1305000000${i}`;
  reiniciarConversacion(cliente, telefono);
  for (const m of caso.mensajes) {
    console.log(`👤 ${m}`);
    const respuesta = await responder(cliente, telefono, m, {
      alRegistrarCliente: async (c) => {
        resultado = c.calificacion;
        console.log(`\n   📋 Calificación: ${c.calificacion} | ¿Se avisa al dueño?: ${debeAvisar(cliente, c) ? "SÍ" : "NO"}`);
        console.log(`   📝 Motivo: ${c.motivo}\n`);
      },
    });
    console.log(`🤖 ${respuesta}\n`);
  }
  const costo = costoConversacion(cliente, telefono);
  costoTotal += costo;
  console.log(`💲 Esta conversación costó $${costo.toFixed(4)}`);
  const ok = resultado === caso.esperado;
  if (ok) aciertos++;
  console.log(ok ? "✅ Calificó como se esperaba" : `❌ Se esperaba ${caso.esperado} y salió ${resultado}`);
}
console.log(`\nResultado: ${aciertos} de ${lista.length} correctos`);
console.log(`💲 Costo total: $${costoTotal.toFixed(4)} | promedio por conversación: $${(costoTotal / lista.length).toFixed(4)}`);
