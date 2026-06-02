/**
 * CRUFFY — Google Apps Script
 * ────────────────────────────────────────────────────────
 * Cómo instalarlo:
 *   1. Abre tu Google Sheet.
 *   2. Menú → Extensiones → Apps Script.
 *   3. Borra el código de ejemplo y pega TODO este archivo.
 *   4. Guarda (Ctrl+S / Cmd+S).
 *   5. Menú → Implementar → Nueva implementación.
 *      - Tipo: "Aplicación web"
 *      - Ejecutar como: "Yo"
 *      - Quién tiene acceso: "Cualquier usuario"
 *   6. Haz clic en "Implementar" → copia la URL que aparece.
 *   7. Pega esa URL como param ?sheet= en la URL de tu landing.
 *      Ejemplo: https://tuuser.github.io/cruffy/?sheet=https://script.google.com/...
 *
 * Columnas que se crean automáticamente en la primera fila:
 *   Timestamp | Nombre | WhatsApp | Email | Canal | Zona | Evento
 * ────────────────────────────────────────────────────────
 */

// Nombre de la hoja donde se guardan los leads.
// Cámbialo si usas otro nombre en tu Sheet.
var SHEET_NAME = 'Leads';

// Cabeceras de las columnas (en el mismo orden que los datos)
var HEADERS = ['Timestamp', 'Nombre', 'WhatsApp', 'Email', 'Canal', 'Zona', 'Evento'];


/**
 * Maneja peticiones POST desde la landing page.
 * Google Apps Script usa doPost() como entry point.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    appendLead(payload);
    return buildResponse({ status: 'ok' });
  } catch (err) {
    return buildResponse({ status: 'error', message: err.message });
  }
}

/**
 * Maneja peticiones GET (útil para probar que el script
 * está activo: visita la URL en el navegador).
 */
function doGet() {
  return buildResponse({ status: 'ok', message: 'Cruffy GAS activo' });
}


/**
 * Escribe una fila nueva en la hoja de leads.
 * Si la hoja no existe la crea con cabeceras.
 */
function appendLead(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Formato de la fila de cabeceras
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#FFD200');
    headerRange.setFontColor('#0E0E0E');
    sheet.setFrozenRows(1);
  }

  // Normaliza y sanea los valores antes de guardar
  var row = [
    data.ts       || new Date().toISOString(),  // Timestamp
    sanitize(data.nombre),                       // Nombre
    sanitize(data.whatsapp),                     // WhatsApp
    sanitize(data.email),                        // Email
    sanitize(data.canal),                        // Canal preferido
    sanitize(data.zona),                         // Zona de Milán
    sanitize(data.evento),                       // Evento / activación
  ];

  sheet.appendRow(row);
}


/**
 * Elimina caracteres potencialmente peligrosos para
 * fórmulas de Sheets (inyección con = + - @).
 */
function sanitize(value) {
  if (value === undefined || value === null) return '';
  var str = String(value).trim();
  // Previene que el valor sea interpretado como fórmula
  if (str.length > 0 && ['=', '+', '-', '@'].indexOf(str[0]) !== -1) {
    str = "'" + str;
  }
  return str;
}


/**
 * Devuelve una respuesta JSON con CORS abierto.
 * (El modo no-cors del fetch ignora la respuesta,
 * pero esto permite probar el script en el navegador.)
 */
function buildResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
