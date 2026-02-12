import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAPI_BASE_URL,
  },
  apiKey: process.env.OPENAPI_KEY,
});
const response = await model.invoke("介绍下自己");
console.log(response);
