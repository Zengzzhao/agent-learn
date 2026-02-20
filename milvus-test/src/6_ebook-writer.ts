import "dotenv/config";
import { parse } from "path";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const COLLECTION_NAME = "ebook_collection";
const VECTOR_DIM = 1024;
const CHUNK_SIZE = 500;
const EPUB_FILE = "./天龙八部.epub";
const BOOK_NAME = parse(EPUB_FILE).name;

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

// 获取文本的嵌入向量
async function getEmbedding(text: string) {
  const result = await embeddings.embedQuery(text);
  return result;
}
// 创建或获取集合
async function ensureCollection(bookId: number) {
  try {
    // 检查集合是否存在
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });
    if (!hasCollection.value) {
      console.log("创建集合...");
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: "id",
            data_type: DataType.VarChar,
            max_length: 100,
            is_primary_key: true,
          },
          // book_id和mysql中的book表关联
          { name: "book_id", data_type: DataType.VarChar, max_length: 100 },
          { name: "book_name", data_type: DataType.VarChar, max_length: 200 },
          { name: "chapter_num", data_type: DataType.Int32 },
          { name: "index", data_type: DataType.Int32 },
          { name: "content", data_type: DataType.VarChar, max_length: 10000 },
          { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        ],
      });
      console.log("✓ 集合创建成功");

      // 创建索引
      console.log("创建索引...");
      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: "vector",
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: { nlist: 1024 },
      });
      console.log("✓ 索引创建成功");

      // 确保集合已加载
      try {
        await client.loadCollection({ collection_name: COLLECTION_NAME });
        console.log("✓ 集合已加载");
      } catch (error) {
        console.log("✓ 集合已处于加载状态");
      }
    }
  } catch (error) {
    console.error("创建集合时出错:", error.message);
    throw error;
  }
}
/**
 * @param chunks 书的一章所拆成的内容chunk数组
 * @param bookId 书对应mysql中book表的id
 * @param chapterNum 书的章节号
 * 将文档块批量插入到Milvus（流式处理）
 */
async function insertChunksBatch(
  chunks: string[],
  bookId: number,
  chapterNum: number,
) {
  try {
    if (chunks.length === 0) {
      return 0;
    }
    // 为每个文档块构建向量及数据并插入到Milvus
    const insertData = await Promise.all(
      chunks.map(async (chunk: string, chunkIndex: number) => {
        const vector = await getEmbedding(chunk);
        return {
          id: `${bookId}_${chapterNum}_${chunkIndex}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: chunkIndex,
          content: chunk,
          vector: vector,
        };
      }),
    );
    // 批量插入数据到milvus
    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData,
    });

    return Number(insertResult.insert_cnt) || 0;
  } catch (error) {
    console.error(`插入章节 ${chapterNum} 的数据时出错`, error.message);
    console.error("错误详情:", error);
    throw error;
  }
}
// 加载epub文件并进行流式处理（边处理边插入）
async function loadAndProcessEPubStreaming(bookId: number) {
  try {
    console.log(`\n开始加载 EPUB 文件: ${EPUB_FILE}`);

    // 使用EPubLoader加载文件，按章节拆分
    const loader = new EPubLoader(EPUB_FILE, {
      splitChapters: true,
    });
    const documents = await loader.load();
    console.log(`✓ 加载完成，共 ${documents.length} 个章节\n`);

    // 创建文本拆分器，拆分到500个字符
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50,
    });

    // 流式处理每个章节：拆分成块，生成向量，并插入数据库
    let totalInserted = 0;
    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;
      console.log(`处理第 ${chapterIndex + 1}/${documents.length} 章...`);
      // 使用textSplitter将章节内容拆分成块
      const chunks = await textSplitter.splitText(chapterContent);
      console.log(`  拆分为 ${chunks.length} 个片段`);
      if (chunks.length === 0) {
        console.log(`  跳过空章节\n`);
        continue;
      }
      console.log(`  生成向量并插入中...`);
      // 将该章的chunks生成shema中的数据格式并批量插入到Milvus
      const insertedCount = await insertChunksBatch(
        chunks,
        bookId,
        chapterIndex + 1,
      );
      totalInserted += insertedCount;
      console.log(
        `  ✓ 已插入 ${insertedCount} 条记录（累计: ${totalInserted}）\n`,
      );
    }
    console.log(`\n总共插入 ${totalInserted} 条记录\n`);
    return totalInserted;
  } catch (error) {
    console.error("加载 EPUB 文件时出错:", error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("=".repeat(80));
    console.log("电子书处理程序");
    console.log("=".repeat(80));

    // 连接milvus
    console.log("\n连接 Milvus...");
    await client.connectPromise;
    console.log("✓ 已连接\n");

    // 设置book_id
    const bookId = 1;
    // 确保数据库中集合存在
    await ensureCollection(bookId);
    // 加载并处理EPUB文件（流式处理，边处理边插入）
    await loadAndProcessEPubStreaming(bookId);

    console.log("=".repeat(80));
    console.log("处理完成！");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n错误:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
