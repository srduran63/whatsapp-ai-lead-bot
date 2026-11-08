import { guardarCaso } from "./db.js";
import { enviarTexto } from "./whatsapp.js";

// ¿Este caso se le manda al dueño? Los que no califican solo se guardan.
export function debeAvisar(cliente, caso) {
  if (caso.calificacion === "califica") return true;
  if (caso.calificacion === "no_califica") return false;
  return cliente.avisarRevisar;
}

// Guarda el caso y, si califica, se lo manda por WhatsApp a las personas del negocio
export async function registrarYAvisar(cliente, caso) {
  const avisar = debeAvisar(cliente, caso);
  guardarCaso(cliente.id, caso, avisar);

  const texto = cliente.perfil.formatearAviso(caso);
  console.log(`\n[${cliente.id}]\n${texto}\n`);
  if (!avisar) {
    console.log(`(No se avisa: ${caso.calificacion})`);
    return;
  }

  for (const numero of cliente.avisos) {
    try {
      await enviarTexto(cliente.whatsapp, numero, texto);
    } catch (error) {
      // El caso ya quedó guardado en la base de datos aunque falle el aviso
      console.error(`No se pudo avisar a ${numero}:`, error.message);
    }
  }
}
