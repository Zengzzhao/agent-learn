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
```

loader：从各种地方加载内容作为 Document，比如 word、pdf、网页、youtube、x 的推文等等。

splitter：加载后的 Document 可能会很大，使用splitter分割成一个个小的文档

