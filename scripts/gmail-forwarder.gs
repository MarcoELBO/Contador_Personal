/**
 * Google Apps Script (gratis): reenvía a Baticueva los avisos de Revolut que lleguen a tu Gmail.
 *
 * INSTALACIÓN (una sola vez):
 *  1. Entra a https://script.google.com con la misma cuenta de Gmail y crea un proyecto nuevo.
 *  2. Pega este archivo completo en Code.gs.
 *  3. Ajustes del proyecto (engrane) > Propiedades de la secuencia de comandos, agrega:
 *       BATICUEVA_URL     = https://TU-DOMINIO/api/inbound-email
 *       INBOUND_SECRET    = (el mismo valor de INBOUND_EMAIL_SECRET en tu servidor)
 *  4. Ejecuta `forwardNew` una vez a mano y acepta los permisos (Gmail y conexión externa).
 *  5. Activadores (reloj) > Añadir activador: función forwardNew, basado en tiempo, cada 5 minutos.
 *
 * El script solo lee correos de Revolut que aún no tengan la etiqueta "baticueva", y se la pone
 * cuando el servidor confirma que los recibió. Si el servidor falla, lo reintenta en la siguiente corrida.
 */

var LABEL = 'baticueva';
var QUERY = 'from:no-reply@revolut.com newer_than:7d -label:' + LABEL;
var MAX_PER_RUN = 25;

function forwardNew() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('BATICUEVA_URL');
  var secret = props.getProperty('INBOUND_SECRET');
  if (!url || !secret) throw new Error('Faltan BATICUEVA_URL o INBOUND_SECRET en las propiedades del script');

  var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  var threads = GmailApp.search(QUERY, 0, MAX_PER_RUN);

  threads.forEach(function (thread) {
    var allOk = true;
    thread.getMessages().forEach(function (msg) {
      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-inbound-secret': secret },
        payload: JSON.stringify({
          id: msg.getId(),
          from: msg.getFrom(),
          subject: msg.getSubject(),
          body: msg.getPlainBody()
        }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) allOk = false;
    });
    if (allOk) thread.addLabel(label);
  });
}
