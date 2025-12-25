const express = require('express');
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');        // 只填写UPLOAD_URL将上传节点,同时填写UPLOAD_URL和PROJECT_URL将上传订阅
const https = require('https');
const WebSocket = require('ws');

// 1. 创建 Express 应用
const app = express();
const PORT = 3000;

// 2. 读取自签名证书
const serverOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert/cert.pem'))
};

// 3. 基于 Express 应用创建 HTTP 服务器（关键：WebSocket 需依附 HTTP 服务器）
// 3. 创建 HTTPS 服务器（替代 HTTP 服务器）
const server = https.createServer(serverOptions, app);

// 4. 创建 WebSocket 服务器并关联 HTTP 服务器
const wss = new WebSocket.Server({ server });

// -------------------------- Express 普通 HTTP 接口示例 --------------------------
app.get('/', (req, res) => {
  res.send(`
    <h1>Express + WebSocket 测试</h1>
    <button onclick="sendMsg()">发送测试消息</button>
    <div id="msgList"></div>
    <script>
      // 客户端 WebSocket 连接（前端测试代码）
      const ws = new WebSocket('ws://' + window.location.host);
      ws.onopen = () => console.log('WebSocket 连接成功');
      ws.onmessage = (e) => {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = '服务端消息：' + e.data;
        document.getElementById('msgList').appendChild(msgDiv);
      };
      ws.onclose = () => console.log('WebSocket 连接关闭');
      ws.onerror = (err) => console.error('WebSocket 错误：', err);

      // 发送消息函数
      function sendMsg() {
        const msg = 'Hello WebSocket! ' + new Date().toLocaleTimeString();
        ws.send(msg);
      }
    </script>
  `);
});

// -------------------------- WebSocket 核心逻辑 --------------------------
// 监听新的 WebSocket 连接
wss.on('connection', (ws, req) => {
  // req 是 HTTP 升级请求对象，可获取客户端 IP、请求头等信息
  const clientIp = req.socket.remoteAddress;
  console.log(`新客户端连接：${clientIp}`);

  // 1. 监听客户端发送的消息
  ws.on('message', (data) => {
    const msg = data.toString(); // 转换为字符串（默认是 Buffer）
    console.log(`收到客户端消息：${msg}`);

    // 示例1：回复当前客户端
    ws.send(`服务端已收到：${msg}（${new Date().toLocaleTimeString()}）`);

    // 示例2：广播消息给所有已连接的客户端（含当前客户端）
    wss.clients.forEach((client) => {
      // 确保客户端连接处于打开状态
      if (client.readyState === WebSocket.OPEN) {
        client.send(`[广播] ${clientIp}：${msg}`);
      }
    });
  });

  // 2. 监听连接关闭
  ws.on('close', (code, reason) => {
    console.log(`客户端断开连接：${clientIp}，状态码：${code}，原因：${reason.toString()}`);
  });

  // 3. 监听连接错误
  ws.on('error', (error) => {
    console.error(`客户端连接错误：${clientIp}，错误：${error.message}`);
  });

  // 4. 主动给新连接的客户端发送欢迎消息
  ws.send(`欢迎连接 WebSocket 服务器！你的 IP：${clientIp}`);
});

// -------------------------- 启动服务器 --------------------------
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 地址：ws://localhost:${PORT}`);
});
