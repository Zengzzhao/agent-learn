# 大模型调用工具

## 流程

初始化基本模型、定义工具、定义对话消息数组

模型绑定工具

使用初始对话消息数组与模型对话，得到首次回答

处理首次回答，看回答中是否有tool_call调用工具字段返回，若有则依次处理每个工具调用，然后将首次回答、工具调用结果依次放入到对话消息数组中

使用组织后的对话消息数组再次与模型对话，得到最终回答



# 项目目录结构

```
-src
	-1_hello-langchain:langchain基本使用，只用模型的回答
	-2_tool-file-read:读文件工具配置给模型
	-3_node-exec:node创建子进程运行命令行命令
	-4_all-tool:给mini版本cursor的工具
	-5_mini-cursor:langchain实现mini版本的cursor
```

