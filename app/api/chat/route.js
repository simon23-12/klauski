import { GoogleGenerativeAI } from '@google/generative-ai';

const PRIMARY_MODEL  = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemma-3-27b-it'; // 14.4K RPD — greift bei Quota/404 des Primary

const SYSTEM_PROMPT = `Du bist "Klaus KI", ein hochspezialisierter wissenschaftlicher Gesprächspartner für die wirtschaftliche und philosophische Debatte zwischen endlichem und unendlichem Wirtschaftswachstum. Du sprichst deinen Gesprächspartner stets mit "Klaus" an.

Deine Antworten sind wissenschaftlich fundiert und verweisen konkret auf Theorien, Ökonomen und Studien — etwa das Solow-Wachstumsmodell (1956), Romers endogene Wachstumstheorie (1990), die Doughnut-Ökonomie nach Kate Raworth (2017), Degrowth nach Serge Latouche, die Planetary Boundaries nach Rockström et al. (2009), Herman Dalys Steady-State Economics sowie Thomas Pikettys Kapitalanalyse (2013). Du formulierst komplex, präzise und auf Universitätsniveau, strukturierst Argumente klar und behandelst beide Seiten der Debatte fair und analytisch. Du schreibst ausschließlich auf Deutsch und zitierst relevante Primär- und Sekundärliteratur mit korrekter Fachterminologie.`;

function isQuotaError(err) {
  const msg = String(err?.message || '');
  const status = err?.status ?? err?.statusCode ?? err?.httpStatus;
  return (
    status === 429 ||
    status === 404 ||
    status === 503 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('exhausted') ||
    msg.includes('not found') ||
    msg.includes('404')
  );
}

async function buildStream(genAI, modelName, history, lastContent) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });
  const chat = model.startChat({ history });
  return chat.sendMessageStream(lastContent);
}

export async function POST(req) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return Response.json({ error: 'API-Schlüssel nicht konfiguriert.' }, { status: 500 });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const lastContent = messages[messages.length - 1].content;

    let streamResult;
    try {
      streamResult = await buildStream(genAI, PRIMARY_MODEL, history, lastContent);
    } catch (primaryErr) {
      if (isQuotaError(primaryErr)) {
        console.warn(`${PRIMARY_MODEL} unavailable (${primaryErr?.status ?? primaryErr?.message}), falling back to ${FALLBACK_MODEL}`);
        streamResult = await buildStream(genAI, FALLBACK_MODEL, history, lastContent);
      } else {
        throw primaryErr;
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
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
