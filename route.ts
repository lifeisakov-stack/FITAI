import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

async function telegram(method: string, body: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) console.error("Telegram API error", method, await res.text());
  return res;
}
async function sendText(chatId: number, text: string, keyboard?: unknown) {
  return telegram("sendMessage", {
    chat_id: chatId, text: text.slice(0, 4000),
    ...(keyboard ? { reply_markup: keyboard } : {})
  });
}
async function aiReply(text: string, imageDataUrl?: string) {
  if (!process.env.OPENAI_API_KEY) return "AI пока не настроен. Добавь OPENAI_API_KEY в Vercel.";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const content: any[] = [{ type: "input_text", text: text || "Проанализируй еду на фото и оцени примерные калории и БЖУ." }];
  if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl, detail: "low" });
  const result = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: "Ты FITAI — дружелюбный фитнес-ассистент. Отвечай по-русски, кратко и полезно. Помогай с питанием, тренировками и восстановлением. Анализ калорий по фото обозначай как приблизительный. Не ставь диагнозы и не советуй экстремальные диеты.",
    input: [{ role: "user", content }]
  });
  return result.output_text || "Не удалось сформировать ответ.";
}
async function getTelegramPhoto(fileId: string): Promise<string | undefined> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!metaRes.ok) return;
  const meta = await metaRes.json();
  const path = meta?.result?.file_path;
  if (!path) return;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
  if (!fileRes.ok) return;
  const bytes = Buffer.from(await fileRes.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) return;
  const mime = fileRes.headers.get("content-type") || "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Bot token is not configured" }, { status: 503 });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const update = await req.json();
    const message = update.message;
    if (!message?.chat?.id) return NextResponse.json({ ok: true });
    const chatId = Number(message.chat.id);
    const text = String(message.text || message.caption || "");
    if (text.startsWith("/start")) {
      const url = process.env.APP_URL;
      const keyboard = url ? { inline_keyboard: [[{ text: "Открыть FITAI", web_app: { url } }]] } : undefined;
      await sendText(chatId, "Привет! Я FITAI — твой AI-фитнес-помощник. Напиши вопрос о питании или тренировках либо открой приложение кнопкой ниже.", keyboard);
      return NextResponse.json({ ok: true });
    }
    if (text.startsWith("/help")) {
      await sendText(chatId, "Команды: /start — открыть FITAI, /help — помощь. Также отправь вопрос или фото еды для примерного анализа калорий и БЖУ.");
      return NextResponse.json({ ok: true });
    }
    let imageDataUrl: string | undefined;
    if (Array.isArray(message.photo) && message.photo.length) {
      const largest = message.photo[message.photo.length - 1];
      imageDataUrl = await getTelegramPhoto(largest.file_id);
    }
    if (!text && !imageDataUrl) {
      await sendText(chatId, "Отправь мне текстовый вопрос или фото блюда.");
      return NextResponse.json({ ok: true });
    }
    await telegram("sendChatAction", { chat_id: chatId, action: "typing" });
    const answer = await aiReply(text, imageDataUrl);
    await sendText(chatId, answer);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
