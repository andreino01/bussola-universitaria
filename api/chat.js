// api/chat.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

// Carica .env.local solo se necessario (locale)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
    if (!process.env.GEMINI_API_KEY) {
        dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
    }
} catch (e) {
    console.warn("Dotenv non caricato (probabilmente in produzione):", e.message);
}

export default async function handler(req, res) {
    // 1. Controllo sicurezza (accetta solo POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, history, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Messaggio vuoto' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("ERRORE: Variabile d'ambiente GEMINI_API_KEY mancante.");
            throw new Error("Chiave API non configurata nel server.");
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });

        // 1. Definiamo le istruzioni (come testo semplice)
        const systemText = `
        ISTRUZIONI DI SISTEMA:
        Agisci come un orientatore universitario esperto, empatico e visionario.
        Stai parlando con uno studente che ha appena fatto un test di orientamento.
        
        DATI STUDENTE:
        ${context || "Nessun dato disponibile."}

        REGOLE:
        1. Rispondi in modo breve (max 4 frasi) e motivante.
        2. Usa qualche emoji ma mai più di 3 per messaggio.
        3. Basati SUI DATI FORNITI per dare consigli personalizzati.
        4. Non inventare facoltà che non esistono.
        5. NON mostrare MAI all'utente nomi di variabili interne, codici tecnici o chiavi dei dati (es. "q_broken", "q_manual", "score_mat", ecc.). Traduci sempre questi concetti in linguaggio naturale comprensibile (es. "la tua curiosità nello smontare le cose" invece di "q_broken").
        6. NON usare formattazione Markdown (no **grassetto**, no *corsivo*, no elenchi puntati con -, no #titoli). Scrivi sempre in testo semplice e discorsivo.
        `;

        // 4. Prepara la cronologia (pulizia dati)
        // La nuova SDK accetta lo stesso formato: { role: 'user' | 'model', parts: [{ text: '...' }] }
        const validHistory = (history || []).filter(h => h.parts && h.parts[0] && h.parts[0].text);

        // 5. Crea la chat
        // Usiamo gemini-2.0-flash che è velocissimo e rispetta i limiti di tempo di Vercel (10s nel piano free)
        const chat = ai.chats.create({
            model: "gemini-2.0-flash",
            history: [
                { role: 'user', parts: [{ text: systemText }] },
                { role: 'model', parts: [{ text: "Ricevuto. Ho analizzato i dati e sono pronto a comportarmi come orientatore." }] },
                ...validHistory
            ]
        });

        // 6. Invia messaggio
        const response = await chat.sendMessage({ message: message });

        // Risposta
        const text = response.text;

        if (!text) throw new Error("Risposta vuota");

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Errore GenAI SDK:", error);

        // Gestione errori specifica per capire se è un problema di modello
        let errorMsg = "L'AI sta riposando. Riprova!";
        if (error.message.includes("404")) errorMsg = "Modello non trovato o non accessibile.";
        if (error.message.includes("429")) errorMsg = "Troppe richieste (Quota esaurita).";

        res.status(500).json({
            error: errorMsg + " (Dettaglio: " + error.message + ")"
        });
    }
}
