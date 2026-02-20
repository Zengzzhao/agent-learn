import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import path from "node:path";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0,
});

async function fileHistoryDemo() {
  // 指定存储文件的路径
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_001";

  // 系统提示词
  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  // 文件系统消息历史对象，恢复之前保存到文件中的对话历史
  const restoreHistory = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });
  const restoredMessages = await restoreHistory.getMessages();
  console.log(`从文件恢复了 ${restoredMessages.length} 条历史消息`);
  restoredMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    console.log(
      `  ${index + 1}.[${prefix}]：${msg.content.substring(0, 50)}...`,
    );
  });

  // 第三轮对话
  console.log('[第三轮对话]');
  const userMessage3=new HumanMessage('需要哪些食材')
  await restoreHistory.addMessage(userMessage3);
  const messages3=[systemMessage,...(await restoreHistory.getMessages())];
  const response3=await model.invoke(messages3);
  await restoreHistory.addMessage(response3);
  console.log(`用户: ${userMessage3.content}`);
  console.log(`助手: ${response3.content}`);
  console.log(`✓ 对话已保存到文件\n`);
}

fileHistoryDemo().catch(console.error);