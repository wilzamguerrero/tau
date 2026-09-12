/**
 * Registro de los casos sin entrega de la vista actual.
 *
 * Vive aparte de la cuadricula para que la tarjeta pueda anotarse aqui sin
 * importar el modulo que la construye (evita un ciclo de importaciones).
 */

/** @type {HTMLInputElement[]} */
let inputs = [];

/** Se llama al repintar la cuadricula. */
export function resetSinEntrega() {
  inputs = [];
}

/** Anota el campo de nota de un caso sin entrega asignado a un estudiante. */
export function registrarSinEntrega(input) {
  inputs.push(input);
}

/** Campos de nota de los casos sin entrega, en el orden en que se pintaron. */
export function casosSinEntrega() {
  return inputs;
}
