// api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        // 2. Collega Gemini usando la chiave segreta salvata su Vercel
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error("GOOGLE_API_KEY mancante");
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemma-3-27b" });

        // 3. Costruisci il prompt di sistema (il "ruolo" dell'AI)
        const systemInstruction = `
        Agisci come un orientatore universitario esperto, empatico e visionario.
        Stai parlando con uno studente che ha appena fatto un test di orientamento.
        
        DATI STUDENTE COMPLETI:
        ${context || "Nessun dato disponibile."}

        ISTRUZIONI:
        1. Rispondi in modo breve (max 4 frasi) e motivante.
        2. Usa emoji.
        3. Basati SUI DATI FORNITI per dare consigli personalizzati. Cita le risposte dell'utente se utile (es. "Visto che ti piacciono i razzi...").
        4. Non inventare facoltà che non esistono.
        `;

        // 4. Prepara la chat
        // Gemini vuole la history in formato { role: 'user'|'model', parts: [{ text: '...' }] }
        // Filtriamo eventuali messaggi vuoti o malformati dalla history
        const validHistory = (history || []).filter(h => h.parts && h.parts[0] && h.parts[0].text);

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }],
                },
                {
                    role: "model",
                    parts: [{ text: "Chiarissimo. Ho analizzato i dati dello studente e sono pronto a dare consigli personalizzati." }],
                },
                ...validHistory
            ],
        });

        // 5. Invia il messaggio
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("Risposta vuota dall'AI");
        }

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Errore Gemini API:", error);
        res.status(500).json({ error: "L'AI è stanca, riprova tra poco! (Dettaglio: " + error.message + ")" });
    }
}