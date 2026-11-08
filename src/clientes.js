// Carga a tus clientes desde la carpeta clientes/ (un archivo .json por cliente).
// Para agregar un cliente nuevo: copia uno de los archivos, cambia los datos y reinicia el bot.
import { readdirSync, readFileSync } from "node:fs";
import { perfiles } from "./perfiles/index.js";

const CARPETA = "clientes";

function cargar(archivo) {
  const config = JSON.parse(readFileSync(`${CARPETA}/${archivo}`, "utf8"));
  const crearPerfil = perfiles[config.perfil];
  if (!crearPerfil) {
    throw new Error(`${archivo}: el perfil "${config.perfil}" no existe. Usa: ${Object.keys(perfiles).join(" o ")}`);
  }
  return {
    id: config.id,
    activo: config.activo !== false,
    nombrePerfil: config.perfil,
    perfil: crearPerfil(config),
    whatsapp: {
      phoneNumberId: config.whatsapp.phoneNumberId,
      // El token no va en el archivo del cliente, sino en el .env
      token: process.env[config.whatsapp.tokenEnv ?? "WHATSAPP_TOKEN"],
    },
    // Si el cliente no tiene números para avisos, se usa TELEFONO_DUENO del .env
    avisos: config.avisos?.length ? config.avisos : [process.env.TELEFONO_DUENO].filter(Boolean),
    avisarRevisar: config.avisarRevisar ?? true,
  };
}

export const clientes = readdirSync(CARPETA)
  .filter((archivo) => archivo.endsWith(".json"))
  .map(cargar);

export function clientePorNumero(phoneNumberId) {
  return clientes.find((c) => c.activo && c.whatsapp.phoneNumberId === phoneNumberId);
}

export function clientePorId(id) {
  return clientes.find((c) => c.id === id);
}
