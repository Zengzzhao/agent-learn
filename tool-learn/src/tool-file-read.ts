import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import fs from "node:fs/promises";
import { z } from "zod";

dotenv.config();
// 初始化模型
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  apiKey: process.env.OPENAPI_KEY,
  temperature: 0,
});
// 定义工具
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(
      ` [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`,
    );
    return `文件内容:\n${content}`;
  },
  {
    name: "read_file",
    description:
      "用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  },
);
const tools = [readFileTool];
const modelWithTools = model.bindTools(tools);
// 对话消息
const messages: BaseMessage[] = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
  new HumanMessage("请读取 src/tool-file-read.ts 文件内容并解释代码"),
];

let response = await modelWithTools.invoke(messages);
messages.push(response);

// 处理工具调用的结果
if (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);
  // 依次处理每个工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        return `错误： 找不到工具 ${toolCall.name}`;
      }
      console.log(
        ` [执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      );
      try {
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch (e) {
        return `错误： ${e.message}`;
      }
    }),
  );
  // 将调用工具的结果添加到消息中，继续对话
  response.tool_calls?.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    );
  });
}

response = await modelWithTools.invoke(messages);
console.log("\n最终模型回复：");
console.log(response.content);
