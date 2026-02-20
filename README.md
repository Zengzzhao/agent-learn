# 工具

tool-learn文件夹

## 大模型调用工具

### 流程

初始化基本模型、定义工具、定义对话消息数组

模型绑定工具

使用初始对话消息数组与模型对话，得到首次回答

处理首次回答，看回答中是否有tool_call调用工具字段返回，若有则依次处理每个工具调用，然后将首次回答、工具调用结果依次放入到对话消息数组中

使用组织后的对话消息数组再次与模型对话，得到最终回答

## 项目目录结构

```
-src
	-1_hello-langchain:langchain基本使用，只用模型的回答
	-2_tool-file-read:读文件工具配置给模型
	-3_node-exec:node创建子进程运行命令行命令
	-4_all-tool:给mini版本cursor的工具
	-5_mini-cursor:langchain实现mini版本的cursor
	-6_my-mcp-server:使用@modelcontextprotocol/sdk开发的mcp服务器
	-7_langchain-mcp-test:langchain使用mcp客户端连接并使用开发的mcp服务器
	-8_mcp-test:集成外部第三方mcp(使用http调用高德mcp、使用stdio使用本地下载的第三方文件操作sdk、浏览器调试工具)
```

使用`@modelcontextprotocol/sdk`开发mcp服务器

使用`@langchain/mcp-adapters`创建mcp客户端，然后获取到mcp-client中的所有工具，绑定给模型



# RAG

rag-learn文件夹

## 大模型调用工具

### 流程

初始化基本模型、嵌入模型

将问题使用嵌入模型向量化，计算预先相似度检索相关文档

将检索到的文档传入提示词中增强prompt

## 项目目录结构

```
-src
	-1_hello-rag:直接创建Document对象实现rag基本使用
	-2_loader-and-splitter:外部知识通过loader加载后splitter分割成一个个chunk这种Document对象
	-3_loader-and-splitter2:外部知识通过loader和splitter后的Document对象向量化后存入向量数据库进行rag全流程
	-4_tiktoken-test:openai模型对应的分词器分词
	-5_CharacterTextSplitter:CharacterTextSplitter的splitter
	-6_RecursiveCharacterTextSplitter-test:重写长度计算函数，使用token记字符数的RecursiveCharacterTextSplitter的splitter
	-7_TokenTextSplitter-test:TokenTextSplitter的splitter
	-8_recursive-splitter-markdown:MarkdownTextSplitter的splitter
	-9_recursive-splitter-latex:LatexTextSplitter的splitter
	-10_recursive-splitter-code:codeSplitter的splitter
```

loader：从各种地方加载内容作为 Document，比如 word、pdf、网页、youtube、x 的推文等等。

splitter：加载后的 Document 可能会很大，使用splitter分割成一个个小的文档

按照sperator首字符分割字符串，形成一个个chunk，如果chunk大小没有超过chunk-size则形成最终chunk，如果chunk大小超过chunk-size则使用sperator后续字符对该chunk继续分割，同时为了确保语义连贯性，被分割的chunk的后续chunk会按照overlap重复前面chunk的一部分内容。如果到最后一个sperator字符拆分完还是大于chunk-size则不会继续拆分了



# 向量数据库milvus

milvus-test文件夹

## milvus架构

![324460ba2d28f957722dc4551126e8df](./README.assets/324460ba2d28f957722dc4551126e8df.png)

一个milvus可以创建多个database数据库

每个database下有多个collection（类似于mysql的表）

每个collection下是多个符合schema（类似于mysql的表结构，字段定义）的entity数据（类似于mysql的记录）

## 项目目录结构

```
-src
	-1_insert:向milvus中插入数据
	-2_query:在milvus中查找数据
	-3_rag:在milvus中检索数据进行rag
	-4_update:在milvus中更新数据
	-5_delete:在milvus中删除数据
	-6_ebook_writer:电子书项目-将电子书知识加载分片向量化后存入向量数据库
	-7_ebook-query:电子书项目-在向量数据库中查找与问题相近的预料chunk
	-8_ebook-reader-rag:电子书项目-rag全流程
```

**插入**

在database中创建collection，对向量所在字段创建索引以加快检索，加载collection，插入数据

**.epub格式电子书向量化入库**

使用EPubLoader加载文件并按章节拆分，遍历每一章使用RecursiveCharacterTextSplitter继续拆分为500个字符的chunk数组，使用Promise.all并行处理一个章节对应的chunk数组，将内容向量化，同时附加所在第x章节、所在章节第x个chunk等元信息存入向量数据库



# Memory

memory-learn文件夹

存储层：之前是基于 messages 不断 push 实现的 Memory 管理机制，langchain提供了history这个api

逻辑层：使用Memory管理策略应对有限的上下文，langchain提供了trimMessages这个api

使用history在存储层将memory存储，使用trimMessages在逻辑层将memory历史消息记录精简后发给LLM

**记忆类型**

长时记忆：memory持久化存储

短时记忆：memory存在内存中

**Memory管理的三大策略**

截断：使用slice直接截取历史消息中最后几条message；使用trimMessages-API根据总token保留最近的message

总结：根据消息数/token数阈值保留后面几条，将之前的发给LLM进行总结生成摘要

检索：根据语义检索之前的message

一般是总结+检索，每隔多少轮对话就进行总结存入milvus中，结合检索来查找

## 项目目录结构

```
-src
	-1_history-test:memory存在内存中的短时记忆
	-2_history-test2:memory存在文件中的长时记忆
	-3_history-test3:从文件中恢复momory继续对话
	-4_truncation-memory:memory管理之截断
	-5_summarization-memory:memory管理之根据消息条数总结
	-6_summarization-memory2:memory管理之根据token数总结
	-7_insert-conversations:memory管理之检索:向向量数据库milvus中插入对话集合
	-8_retrieval-memory:memory管理之检索:使用rag流程从向量数据库中检索相关语料放入提示词中让LLM回答问题,并将对话保存到数据库供以后对话检索
```



# 结构化大模型输出

output-parser-learn文件夹

如果大模型输出不做控制，输出是自然语言格式，但是我们希望按照自己的格式返回一个json，我们可以在prompt里描述格式，然后按照这种格式解析大模型返回的结果字符串。langchain提供了output parser这个api基于这个思路做了封装

## 项目目录结构

```
-src
	-1_normal:在prompt中指定返回json格式后解析,由于LLM输出自带md语法所以解析失败
	-2_json-output-parser:使用JsonOutputParser实现结构化输出
	-3_structured-output-parser:使用名称和描述构建的StructuredOutputParser实现结构化输出
	-4_structured-output-parser2:使用zod构建的复杂StructuredOutputParser实现结构化输出
	-5_tool_call-args:定义tool及其参数格式绑定给模型，通过模型返回消息中的tool_calls取到结构化输出（因为模型训练的时候就保证了生成的tool_calls参数一定是符合格式要求的）
	-6_with-structured-output:使用withStructuredOutput实现结构化输出
	-7_stream-normal:LLM流式输出
	-8_stream-with-structured-output:使用withStructuredOutput实现LLM流式结构化输出,由于withStructuredOutput在json生成完通过校验后再返回,所以只有一个chunk包含完整json,不是真的流式输出
	-9_stream-structured-partial:使用StructuredOutputParser实现LLM流式结构化输出
	-10_stream-tool-calls-raw:使用tool实现LLM的流式结构化输出(tool_call_chunks字段实现)
	-11_stream-tool-calls-parser:使用JsonOutputToolsParser实现流式返回的tool_call_chunks不完整,也能拼成正确格式的 tool_calls
	-12_xml-output-parser:使用XMLOutputParser实现XML的结构化输出
```

withStructuredOutput：判断模型是否支持tool calls，支持的话就用tool的方式获取结构化数据，否则用output parser的方式，不用自己处理。但它有两个不适合的场景：流式打印、xml等非json格式，需要使用output parser