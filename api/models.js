// api/models.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

export default async function handler(req, res) {
    // 1. Prende la chiave dal file .env.local
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Chiave API non trovata nel file .env.local" });
    }

    try {
        // 2. Chiamata diretta ai server di Google (senza librerie, così vediamo la verità pura)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        // 3. Filtriamo la lista per pulizia
        if (data.models) {
            const usefulModels = data.models
                .filter(m => m.supportedGenerationMethods.includes("generateContent")) // Solo quelli che scrivono testo
                .map(m => ({
                    name: m.name, // Il nome tecnico da usare nel codice (es: models/gemini-1.5-flash)
                    displayName: m.displayName,
                    version: m.version,
                    inputLimit: m.inputTokenLimit,
                    outputLimit: m.outputTokenLimit
                }));

            // Restituisce la lista pulita
            return res.status(200).json({ count: usefulModels.length, models: usefulModels });
        } else {
            return res.status(200).json(data); // Se c'è un errore di Google, mostralo
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}