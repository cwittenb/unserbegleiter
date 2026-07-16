// Stub für das workerd-Runtime-Modul "cloudflare:sockets" (Vitest-Alias, S66).
//
// Zweck: mailer.js in Node-Tests importierbar machen UND den SMTP-Dialog
// gegen einen gescripteten Fake-Server beweisen (die echte Übertragung bleibt
// deploy-verifiziert — hier geht es um die Zustandsmaschine: EHLO, STARTTLS,
// AUTH, MAIL/RCPT/DATA, Fehlercodes).
//
// Skript-Konvention: setzeSmtpSkript(antworten) legt eine Antwort-Queue an;
// jede vom Mailer gelesene Server-Antwort ist der nächste Eintrag. Gesendete
// Befehle landen in gesendet[] (Assertions). startTls() liefert denselben
// skriptgesteuerten Socket weiter (Queue läuft durch).

let skript = [];
let gesendetPuffer = [];
export function setzeSmtpSkript(antworten) { skript = [...antworten]; gesendetPuffer = []; }
export function gesendet() { return gesendetPuffer; }

function baueSocket() {
  const enc = new TextEncoder();
  const socket = {
    readable: new ReadableStream({
      pull(controller) {
        if (!skript.length) { controller.close(); return; }
        controller.enqueue(enc.encode(skript.shift() + "\r\n"));
      },
    }),
    writable: new WritableStream({
      write(chunk) { gesendetPuffer.push(new TextDecoder().decode(chunk)); },
    }),
    startTls() { return baueSocket(); },
    async close() { /* egal */ },
  };
  return socket;
}

export function connect(_adresse, _optionen) {
  return baueSocket();
}
