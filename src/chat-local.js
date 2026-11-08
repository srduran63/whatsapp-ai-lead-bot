// Prueba el bot de un cliente en la terminal, sin WhatsApp:
//   npm run chat                  (usa el primer cliente)
//   npm run chat -- demo-taller   (elige el cliente por su id)
import readline from "node:readline/promises";
import { reiniciarConversacion, responder } from "./bot.js";
import { debeAvisar } from "./avisos.js";
import { clientePorId, clientes } from "./clientes.js";

const cliente = clientePorId(process.argv[2] ?? clientes[0].id);
if (!cliente) {
  console.error(`No existe ese cliente. Clientes: ${clientes.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const TELEFONO = "13050000000";
reiniciarConversacion(cliente, TELEFONO);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`Probando el bot de "${cliente.id}". Escribe como si fueras una persona. "salir" para terminar.\n`);

while (true) {
  const texto = (await rl.question("Tú: ")).trim();
  if (!texto) continue;
  if (texto.toLowerCase() === "salir") break;

  const respuesta = await responder(cliente, TELEFONO, texto, {
    alRegistrarCliente: async (caso) => {
      const titulo = debeAvisar(cliente, caso) ? "Aviso que recibiría el dueño" : "NO se le avisa al dueño";
      console.log(`\n--- ${titulo} ---\n${cliente.perfil.formatearAviso(caso)}\n---\n`);
    },
  });
  console.log(`Bot: ${respuesta}\n`);
}
rl.close();
