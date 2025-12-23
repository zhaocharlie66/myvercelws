const express = require('express');
const os = require('os');
const fs = require('fs');
const axios = require('axios');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { Buffer } = require('buffer');
const { exec, execSync } = require('child_process');
const { WebSocket, createWebSocketStream } = require('ws');

const app = express();

// 环境变量配置
const UUID = process.env.UUID || '34a042fa-7407-4c83-b1ab-df32cb2e112f';
const DOMAIN = process.env.DOMAIN || 'mynavigator.vercel.app';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const WSPATH = process.env.WSPATH || UUID.slice(0, 8);
const SUB_PATH = process.env.SUB_PATH || 'crazy';
const NAME = process.env.NAME || 'myVercel';
const PORT = process.env.PORT || 3000;

// 获取 ISP 信息
let ISP = '';
const GetISP = async () => {
  try {
    const res = await axios.get('https://api.ip.sb/geoip');
    const data = res.data;
    ISP = `${data.country_code}-${data.isp}`.replace(/ /g, '_');
  } catch (e) {
    ISP = 'Unknown';
  }
};

GetISP();

// --- Express 路由定义 ---

// 首页路由
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  // 检查文件是否存在，模仿原生代码的逻辑
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(200).send('Hello world!');
    } else {
      res.sendFile(filePath);
    }
  });
});

// 订阅路由
app.get(`/${SUB_PATH}`, (req, res) => {
  const namePart = NAME ? `${NAME}-${ISP}` : ISP;
  const vlessURL = `vless://${UUID}@cdns.doon.eu.org:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F${WSPATH}#${namePart}`;
  const trojanURL = `trojan://${UUID}@cdns.doon.eu.org:443?security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F${WSPATH}#${namePart}`;
  
  const subscription = vlessURL + '\n' + trojanURL;
  const base64Content = Buffer.from(subscription).toString('base64');
  
  console.log(`subscription is ${base64Content}`);
  
  res.type('text/plain');
  res.send(base64Content + '\n');
});

// --- 服务器启动 ---

// 使用 app.listen 启动 HTTP 服务器并获取 server 实例
const server = app.listen(PORT, () => {
  runnz();
  setTimeout(() => {
    delFiles();
  }, 180000);
  console.log(`Server is running on port ${PORT}`);
});
