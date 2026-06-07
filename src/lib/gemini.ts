/**
 * gemini.ts — AI Art Analysis
 *
 * If NEXT_PUBLIC_GEMINI_API_KEY is absent or invalid,
 * all calls return a friendly "unavailable" message
 * so the rest of the platform keeps working normally.
 */

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

// A key is considered valid only if it starts with the standard AIza prefix
const isKeyValid = API_KEY.startsWith("AIza");

const UNAVAILABLE_MSG =
  "⚠️ خدمة تحليل الذكاء الاصطناعي غير متوفرة حالياً. يمكنك الاستمرار في استخدام المنصة بشكل طبيعي.";

export const analyzeArt = async (file: File): Promise<string> => {
  // Immediately return fallback if key is missing or malformed
  if (!isKeyValid) {
    console.warn(
      "[Gemini] API key is missing or invalid — returning fallback message."
    );
    return UNAVAILABLE_MSG;
  }

  try {
    // Dynamic import so the SDK is never loaded when the key is absent
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `
      أنت الآن خبير وفنان تشكيلي محترف. قم بتحليل هذه الرسمة التي أرسلها أحد طلاب أكاديمية Snakket كجزء من مسابقة رسم.
      المطلوب منك هو تقديم تحليل فني دقيق كالتالي:
      1. نقاط القوة (ماهو الجميل والاحترافي في الرسمة؟).
      2. نقاط الضعف الفنية (ما الذي يحتاج إلى تحسين؟).
      3. نصيحة ذهبية لتطوير المهارة.
      4. قرار نهائي: هل تستحق الرسمة أن تكون الفائزة؟ (أجب باختصار في النهاية).
      اجعل أسلوبك مشجعاً واحترافياً. استخدم اللغة العربية حصراً.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: file.type } },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("[Gemini] Analysis failed:", error);
    // Never crash the caller — return friendly fallback
    return UNAVAILABLE_MSG;
  }
};
