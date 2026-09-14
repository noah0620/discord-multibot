import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

function getClient(apiKey) {
  if (!apiKey) throw new Error("GOOGLE_API_KEY が未設定です。");
  return new GoogleGenAI({ apiKey });
}

export async function generateGoogleImage({
  apiKey,
  model = "gemini-3.1-flash-image",
  prompt,
  outputDir,
  aspectRatio = "1:1",
  imageSize = "1K"
}) {
  const ai = getClient(apiKey);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      responseFormat: {
        image: {
          aspectRatio,
          imageSize
        }
      }
    }
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Google APIから画像データが返されませんでした。");
  }

  const mime = imagePart.inlineData.mimeType || "image/png";
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";

  fs.mkdirSync(outputDir, { recursive: true });
  const out = path.join(outputDir, `google-image-${Date.now()}.${ext}`);
  fs.writeFileSync(out, Buffer.from(imagePart.inlineData.data, "base64"));
  return out;
}

export async function generateGoogleVideo({
  apiKey,
  model = "veo-3.1-generate-preview",
  prompt,
  outputDir,
  aspectRatio = "16:9"
}) {
  const ai = getClient(apiKey);

  let operation = await ai.models.generateVideos({
    model,
    prompt,
    config: { aspectRatio }
  });

  const timeoutMs = 15 * 60 * 1000;
  const started = Date.now();

  while (!operation.done) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Google Veoの生成が15分を超えたためタイムアウトしました。");
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const generated = operation?.response?.generatedVideos?.[0];
  if (!generated?.video) {
    throw new Error("Google Veoから動画が返されませんでした。");
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const out = path.join(outputDir, `google-video-${Date.now()}.mp4`);

  await ai.files.download({
    file: generated.video,
    downloadPath: out
  });

  return out;
}
