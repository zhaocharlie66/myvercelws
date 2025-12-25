const express = require('express');
const https = require('https'); // 替换 http 为 https
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;

// 1. 读取自签名证书
const serverOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert/cert.pem'))
};

// 2. 创建 HTTPS 服务器（替代 HTTP 服务器）
const server = https.createServer(serverOptions, app);

// 3. 创建 WSS 服务器（WebSocket Secure）
const wss = new WebSocket.Server({ server });

// -------------------------- 保持原有 Express 逻辑不变 --------------------------
app.get('/', (req, res) => {
  res.send(`
    <h1>Express + WSS 测试</h1>
    <button onclick="sendMsg()">发送测试消息</button>
    <div id="msgList"></div>
    <script>
      // 关键：客户端改用 wss:// 协议（而非 ws://）
      const ws = new WebSocket('wss://' + window.location.host);
      ws.onopen = () => console.log('WSS 连接成功');
      ws.onmessage = (e) => {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = '服务端消息：' + e.data;
        document.getElementById('msgList').appendChild(msgDiv);
      };
      ws.onclose = () => console.log('WSS 连接关闭');
      ws.onerror = (err) => console.error('WSS 错误：', err);

      function sendMsg() {
        const msg = 'Hello WSS! ' + new Date().toLocaleTimeString();
        ws.send(msg);
      }
    </script>
  `);
});

// -------------------------- 保持原有 WebSocket 逻辑不变 --------------------------
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`新客户端连接（WSS）：${clientIp}`);

  ws.on('message', (data) => {
    const msg = data.toString();
    console.log(`收到客户端消息：${msg}`);
    ws.send(`服务端已收到：${msg}（${new Date().toLocaleTimeString()}）`);
    // 广播逻辑不变
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`[广播] ${clientIp}：${msg}`);
      }
    });
  });

  ws.on('close', (code, reason) => {
    console.log(`客户端断开连接：${clientIp}，状态码：${code}，原因：${reason.toString()}`);
  });

  ws.on('error', (error) => {
    console.error(`客户端连接错误：${clientIp}，错误：${error.message}`);
  });

  ws.send(`欢迎连接 WSS 服务器！你的 IP：${clientIp}`);
});

// -------------------------- 启动 HTTPS 服务器 --------------------------
server.listen(PORT, () => {
  console.log(`HTTPS 服务器运行在 https://localhost:${PORT}`);
  console.log(`WSS 地址：wss://localhost:${PORT}`);
});

// *** 关键修复步骤 ***
module.exports = app;
