import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";

const COLLECTION_NAME = "ebook_collection";
const VECTOR_DIM = 1024;

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAPI_KEY,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  temperature: 0.7,
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
// 从 Milvus 中检索与问题相关的内容
async function retrieveRelevantContent(qusetion: string, k = 3) {
  try {
    const queryVector = await getEmbedding(qusetion);
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "book_id", "chapter_num", "index", "content"],
    });
    return searchResult.results;
  } catch (error) {
    console.error("检索内容时出错:", error.message);
    return [];
  }
}
// 使用rag回答关于电子书的问题
async function answerEbookQuestion(question: string, k = 3) {
  try {
    console.log("=".repeat(80));
    console.log(`问题: ${question}`);
    console.log("=".repeat(80));

    // 检索内容并打印
    console.log("\n【检索相关内容】");
    const retrievedContent = await retrieveRelevantContent(question, k);
    if (retrievedContent.length === 0) {
      console.log("未找到相关内容");
      return "抱歉，我没有找到相关的《天龙八部》内容。";
    }
    retrievedContent.forEach((item, i) => {
      console.log(`\n[片段 ${i + 1}] 相似度: ${item.score.toFixed(4)}`);
      console.log(`书籍: ${item.book_id}`);
      console.log(`章节: 第 ${item.chapter_num} 章`);
      console.log(`片段索引: ${item.index}`);
      console.log(
        `内容: ${item.content.substring(0, 200)}${item.content.length > 200 ? "..." : ""}`,
      );
    });

    // 构建上下文
    const context = retrievedContent
      .map((item, i) => {
        return `[片段 ${i + 1}]
章节: 第 ${item.chapter_num} 章
内容: ${item.content}`;
      })
      .join("\n\n━━━━━\n\n");

    // 构建prompt
    const prompt = `你是一个专业的《天龙八部》小说助手。基于小说内容回答问题，用准确、详细的语言。

请根据以下《天龙八部》小说片段内容回答问题：
${context}

用户问题: ${question}

回答要求：
1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

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

    // 确保集合已加载
    try {
      await client.loadCollection({
        collection_name: COLLECTION_NAME,
      });
      console.log("✓ 集合已加载\n");
    } catch (error) {
      if (!error.message.includes("already loaded")) {
        throw error;
      }
      console.log("✓ 集合已处于加载状态\n");
    }

    await answerEbookQuestion("鸠摩智会什么武功？", 5);
  } catch (error) {
    console.error("错误:", error.message);
  }
}

main();
