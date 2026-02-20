import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0,
});
const prompt = `详细介绍莫扎特的信息。`;

console.log("🌊 普通流式输出演示（无结构化）\n");
try {
  const stream = await model.stream(prompt);
  let fullContent = "";
  let chunkCount = 0;
  console.log("📡 接收流式数据:\n");
  for await (const chunk of stream) {
    chunkCount++;
    const content = chunk.content;
    fullContent += content;
    process.stdout.write(content);
  }
  console.log(`\n\n✅ 共接收 ${chunkCount} 个数据块\n`);
  console.log(`📝 完整内容长度: ${fullContent.length} 字符`);
} catch (error) {
  console.error("\n❌ 错误:", error.message);
}
