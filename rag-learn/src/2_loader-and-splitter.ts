import "dotenv/config";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import {RecursiveCharacterTextSplitter} from '@langchain/textsplitters'

// 使用 CheerioWebBaseLoader 从指定 URL 加载文档，并选择特定的 HTML 元素进行提取
const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7233327509919547452",
  {
    selector: ".main-area p",
  },
);
// 加载文档并提取内容
const documents=await cheerioLoader.load();

// 使用 RecursiveCharacterTextSplitter 将提取的文档内容进行分割`
const textSplitter=new RecursiveCharacterTextSplitter({
    chunkSize:400, // 每个文本块的最大长度
    chunkOverlap:50, // 每个文本块与前后文本块的重叠长度
    separators:['。','！','？'] // 分割文本的分隔符
})
const splitDocuments=await textSplitter.splitDocuments(documents)

