import "dotenv/config";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const COLLECTION_NAME = "ai_diary";
const VECTOR_DIM = 1024;

// chat模型
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0.7,
});
// 嵌入模型
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});
// Milvus 客户端
const client = new MilvusClient({
  address: `${process.env.MILVUS_HOST}:19530`,
});

// 给文本生成嵌入向量
async function getEmbedding(text: string) {
  const result = await embeddings.embedQuery(text);
  return result;
}
// 从milvus中搜索相关的日记内容
async function retrieveRelevantDiaries(question: string, k = 2) {
  try {
    // 将问题转换为向量
    const queryVector = await getEmbedding(question);
    // 在Milvus中进行向量搜索
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "date", "mood", "tags"],
    });
    return searchResult.results;
  } catch (error) {
    console.error("检索日记时出错:", error.message);
    return [];
  }
}
// 使用rag回答关于日记的问题
async function answerDiaryQuestion(question: string, k = 2) {
  try {
    console.log("=".repeat(80));
    console.log(`问题: ${question}`);
    console.log("=".repeat(80));

    // 检索相关的日记内容
    console.log("\n【检索相关日记】");
    const retrievedDiaries = await retrieveRelevantDiaries(question, k);
    if (retrieveRelevantDiaries.length === 0) {
      console.log("未找到相关日记");
      return "抱歉，我没有找到相关的日记内容。";
    }
    // 打印检索到的日记及相似度
    retrievedDiaries.forEach((diary, i) => {
      console.log(`\n[日记 ${i + 1}] 相似度: ${diary.score.toFixed(4)}`);
      console.log(`日期: ${diary.date}`);
      console.log(`心情: ${diary.mood}`);
      console.log(`标签: ${diary.tags?.join(", ")}`);
      console.log(`内容: ${diary.content}`);
    });

    // 构建上下文
    const context = retrievedDiaries
      .map((diary, i) => {
        return `[日记 ${i + 1}]
日期: ${diary.date}
心情: ${diary.mood}
标签: ${diary.tags?.join(", ")}
内容: ${diary.content}`;
      })
      .join("\n\n━━━━━\n\n");

    // 构建prompt
    const prompt = `你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题，用亲切自然的语言。

请根据以下日记内容回答问题：
${context}

用户问题: ${question}

回答要求：
1. 如果日记中有相关信息，请结合日记内容给出详细、温暖的回答
2. 可以总结多篇日记的内容，找出共同点或趋势
3. 如果日记中没有相关信息，请温和地告知用户
4. 用第一人称"你"来称呼日记的作者
5. 回答要有同理心，让用户感到被理解和关心

AI 助手的回答:`;

    // 调用语言模型生成答案
    console.log("\n【AI 回答】");
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log("\n");

    return response.content;
  } catch (error) {
    console.error("回答问题时出错:", error.message);
    return "抱歉，处理您的问题时出现了错误。";
  }
}

async function main() {
  try {
    console.log("连接到 Milvus...");
    await client.connectPromise;
    console.log("✓ 已连接\n");

    await answerDiaryQuestion("我最近做了什么让我感到快乐的事情？", 2);
  } catch (error) {
    console.error("错误:", error.message);
  }
}


main();