import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { z } from "zod";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0,
});
const scientistSchema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().optional().describe("去世年份，如果还在世则不填"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
  achievements: z.array(z.string()).describe("主要成就"),
  biography: z.string().describe("简短传记"),
});
const modelWithTool = model.bindTools([
  {
    name: "extract_scientist_info",
    description: "提取和结构化科学家的详细信息",
    schema: scientistSchema,
  },
]);
const parser = new JsonOutputToolsParser();
const chain = modelWithTool.pipe(parser);
try {
  const stream = await chain.stream("详细介绍牛顿的生平和成就");
  let lastContent = "";
  let finalResult = null;
  console.log("📡 实时输出流式内容:\n");
  for await (const chunk of stream) {
    if (chunk.length > 0) {
      const toolCall = chunk[0];
      console.log(toolCall.args);
    }
  }
  console.log("\n\n✅ 流式输出完成");
} catch (error) {
  console.error("\n❌ 错误:", error.message);
  console.error(error);
}
