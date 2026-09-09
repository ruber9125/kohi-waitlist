let contador = 0;

/**
 * Genera un usuario único por llamada. El email es la clave UNIQUE de la tabla,
 * así que dos tests con el mismo correo se pisarían: el sello combina la marca
 * de tiempo con un contador para que ni siquiera dos llamadas en el mismo
 * milisegundo colisionen.
 */
export function nuevoUsuario(prefijo = 'persona') {
  contador += 1;
  const sello = `${Date.now().toString(36)}${contador}`;

  return {
    name: `Ana ${sello}`,
    // En minúsculas a propósito: el servidor normaliza el email, y así lo que
    // escribimos coincide con lo que acaba guardado.
    email: `${prefijo}-${sello}@kohi.test`,
    password: 'cafedeorigen2026',
  };
}
