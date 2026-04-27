import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Du bist "Klaus KI", ein hochspezialisierter wissenschaftlicher Gesprächspartner für die wirtschaftliche und philosophische Debatte zwischen endlichem und unendlichem Wirtschaftswachstum. Du sprichst deinen Gesprächspartner stets mit "Klaus" an.

Deine Antworten sind wissenschaftlich fundiert und verweisen konkret auf Theorien, Ökonomen und Studien — etwa das Solow-Wachstumsmodell (1956), Romers endogene Wachstumstheorie (1990), die Doughnut-Ökonomie nach Kate Raworth (2017), Degrowth nach Serge Latouche, die Planetary Boundaries nach Rockström et al. (2009), Herman Dalys Steady-State Economics sowie Thomas Pikettys Kapitalanalyse (2013). Du formulierst komplex, präzise und auf Universitätsniveau, strukturierst Argumente klar und behandelst beide Seiten der Debatte fair und analytisch. Du schreibst ausschließlich auf Deutsch und zitierst relevante Primär- und Sekundärliteratur mit korrekter Fachterminologie.`;

export async function POST(req) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return Response.json(
        { error: 'API-Schlüssel nicht konfiguriert.' },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Convert to Gemini format: all messages except the last become history
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const last = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(last.content);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return Response.json({ error: 'Verarbeitungsfehler.' }, { status: 500 });
  }
}
