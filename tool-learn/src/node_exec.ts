import { spawn } from "child_process";

// 使用vite创建react-ts项目的命令
const command =
  'echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts';
const cwd = process.cwd();

// 解析命令和参数
const [cmd, ...args] = command.split(" ");

const child = spawn(cmd, args, {
  cwd,
  stdio: "inherit", // 将子进程的输出直接显示在当前终端
  shell: true,
});

let errorMsg = "";
child.on("error", (error) => {
  errorMsg = error.message;
});
child.on("close", (code) => {
  if (code === 0) {
    process.exit(0);
  } else {
    if (errorMsg) {
      console.error(`错误: ${errorMsg}`);
    }
    process.exit(code || 1);
  }
});
