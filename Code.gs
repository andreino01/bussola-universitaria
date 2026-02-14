// ISTRUZIONI:
// 1. Vai su https://script.google.com/home
// 2. Crea un "Nuovo progetto"
// 3. Incolla questo codice nel file "Code.gs" (cancella tutto quello che c'è prima)
// 4. Salva il progetto (icona Floppy o Ctrl+S)
// 5. Clicca su "Deploy" (in alto a destra) -> "Nuovo deploy"
// 6. Seleziona il tipo: "Web app" (ingranaggio -> Web app)
// 7. Descrizione: "Bussola Quiz Backend"
// 8. Esegui come: "Me" (la tua email)
// 9. Chi può accedere: "Chiunque" (Anyone) -> IMPORTANTE!
// 10. Clicca "Deploy"
// 11. Autorizza l'accesso quando richiesto
// 12. Copia l'URL della Web App (finisce con /exec) e dallo a me (o incollalo nel codice JS)

function doPost(e) {
  try {
    var sheetName = "RisposteQuiz"; // Nome del foglio (tab)
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(sheetName);

    // Se il foglio non esiste, crealo e aggiungi intestazioni
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      sheet.appendRow([
        "Timestamp",
        "Vincitore",
        "Punteggio",
        "Alternative",
        "Voto Feedback",
        "Commento Feedback",
        "Risposte JSON" // Per debug o analisi future
      ]);
    }

    // Parsa i dati ricevuti (arrivano come testo plain con JSON dentro)
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    // Prepara la riga da inserire
    var timestamp = new Date();
    var winner = data.winner || "N/A";
    var winnerScore = data.winnerScore || 0;
    
    // Formatta le alternative in una stringa leggibile: "Economia (85), Legge (80)"
    var alternatives = "";
    if (data.alternatives && Array.isArray(data.alternatives)) {
      alternatives = data.alternatives.map(function(a) {
        return a.name + " (" + Math.round(a.score) + ")";
      }).join(", ");
    }

    var feedbackRating = data.feedbackRating || "";
    var feedbackComment = data.feedbackComment || "";
    var allAnswersOneString = JSON.stringify(data.answers || {}); // Salviamo tutto il obj risposte

    // Aggiungi la riga
    sheet.appendRow([
      timestamp,
      winner,
      winnerScore,
      alternatives,
      feedbackRating,
      feedbackComment,
      allAnswersOneString
    ]);

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
