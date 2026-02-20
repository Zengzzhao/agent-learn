import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const COLLECTION_NAME = "conversations";
const VECTOR_DIM = 1024;

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0,
});
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});
const client = new MilvusClient({
  address: `${process.env.MILVUS_HOST}:19530`,
});

async function getEmbedding(text: string) {
  const result = await embeddings.embedQuery(text);
  return result;
}
// 从milvus中检索相关的历史对话
async function retrieveRelevantConversations(query: string, k = 2) {
  try {
    const queryVector = await getEmbedding(query);
    const searchResults = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "round", "timestamp"],
    });
    return searchResults.results;
  } catch (error) {
    console.error("检索对话时出错:", error.message);
    return [];
  }
}
// 检索，使用milvus向量数据库存储历史对话，根据当前输入检索语义相关的历史
async function retrievalMemoryDemo() {
  try {
    console.log("连接到 Milvus...");
    await client.connectPromise;
    console.log("✓ 已连接\n");
  } catch (error) {
    console.error("❌ 无法连接到 Milvus:", error.message);
    return;
  }

  // 历史消息
  const history = new InMemoryChatMessageHistory();
  const conversations = [
    { input: "我之前提到的机器学习项目进展如何？" },
    { input: "我周末经常做什么？" },
    { input: "我的职业是什么？" },
  ];
  for (let i = 0; i < conversations.length; i++) {
    const { input } = conversations[i];
    const userMessage = new HumanMessage(input);
    console.log(`\n[第 ${i + 1} 轮对话]`);
    console.log(`用户: ${input}`);
    // 1.检索相关的历史对话
    console.log("\n【检索相关历史对话】");
    const retrievedConversations = await retrieveRelevantConversations(
      input,
      2,
    );
    let relevantHistory = "";
    if (retrievedConversations.length > 0) {
      retrievedConversations.forEach((conv, idx) => {
        console.log(`\n[历史对话 ${idx + 1}] 相似度: ${conv.score.toFixed(4)}`);
        console.log(`轮次: ${conv.round}`);
        console.log(`内容: ${conv.content}`);
      });
      // 构建上下文
      relevantHistory = retrievedConversations
        .map((conv, idx) => {
          return `[历史对话 ${idx + 1}]
轮次: ${conv.round}
${conv.content}`;
        })
        .join("\n\n━━━━━\n\n");
    } else {
      console.log("未找到相关历史对话");
    }
    // 2.构建prompt
    const contextMessages = relevantHistory
      ? [
          new HumanMessage(
            `相关历史对话：\n${relevantHistory}\n\n用户问题: ${input}`,
          ),
        ]
      : [userMessage];
    // 3.调用语言模型生成回答
    console.log("\n【AI 回答】");
    const response = await model.invoke(contextMessages);
    console.log(`助手: ${response.content}`);
    // 保存当前对话到历史消息
    await history.addMessage(userMessage);
    await history.addMessage(response);
    // 4.将对话保存到milvus向量数据库
    const conversationText = `用户: ${input}\n助手: ${response.content}`;
    const convId = `conv_${Date.now()}_${i + 1}`;
    const convVector = await getEmbedding(conversationText);
    try {
      await client.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            id: convId,
            vector: convVector,
            content: conversationText,
            round: i + 1,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log(`💾 已保存到 Milvus 向量数据库`);
    } catch (error) {
      console.warn("保存到向量数据库时出错:", error.message);
    }
  }
}

retrievalMemoryDemo().catch(console.error);
