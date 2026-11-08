// Base de datos (un archivo en data/bot.db). Guarda las conversaciones y los casos
// para que no se pierdan al reiniciar el bot.
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

mkdirSync("data", { recursive: true });
const db = new DatabaseSync("data/bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversaciones (
    cliente_id TEXT NOT NULL,
    telefono TEXT NOT NULL,
    mensajes TEXT NOT NULL,
    costo REAL NOT NULL DEFAULT 0,
    ultima_actividad INTEGER NOT NULL,
    PRIMARY KEY (cliente_id, telefono)
  );
  CREATE TABLE IF NOT EXISTS casos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id TEXT NOT NULL,
    telefono TEXT NOT NULL,
    calificacion TEXT NOT NULL,
    datos TEXT NOT NULL,
    avisado INTEGER NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const sqlLeer = db.prepare(
  "SELECT mensajes, costo, ultima_actividad FROM conversaciones WHERE cliente_id = ? AND telefono = ?",
);
const sqlGuardar = db.prepare(`
  INSERT INTO conversaciones (cliente_id, telefono, mensajes, costo, ultima_actividad)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (cliente_id, telefono) DO UPDATE SET
    mensajes = excluded.mensajes, costo = excluded.costo, ultima_actividad = excluded.ultima_actividad
`);
const sqlBorrar = db.prepare("DELETE FROM conversaciones WHERE cliente_id = ? AND telefono = ?");
const sqlCaso = db.prepare(
  "INSERT INTO casos (cliente_id, telefono, calificacion, datos, avisado) VALUES (?, ?, ?, ?, ?)",
);

export function leerConversacion(clienteId, telefono) {
  const fila = sqlLeer.get(clienteId, telefono);
  if (!fila) return null;
  return { mensajes: JSON.parse(fila.mensajes), costo: fila.costo, ultimaActividad: fila.ultima_actividad };
}

export function guardarConversacion(clienteId, telefono, conv) {
  sqlGuardar.run(clienteId, telefono, JSON.stringify(conv.mensajes), conv.costo, conv.ultimaActividad);
}

export function borrarConversacion(clienteId, telefono) {
  sqlBorrar.run(clienteId, telefono);
}

export function guardarCaso(clienteId, caso, avisado) {
  sqlCaso.run(clienteId, caso.telefono, caso.calificacion, JSON.stringify(caso), avisado ? 1 : 0);
}

const sqlBorrarViejas = db.prepare("DELETE FROM conversaciones WHERE ultima_actividad < ?");

export function borrarConversacionesViejas(dias) {
  return Number(sqlBorrarViejas.run(Date.now() - dias * 24 * 60 * 60 * 1000).changes);
}
