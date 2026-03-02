#!/usr/bin/env node

import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { TushareClient } from './tushare/client.js';
import { createRoutes } from './api/routes.js';
import { TushareMCPServer } from './mcp/server.js';

// 从环境变量获取配置
const TUSHARE_TOKEN = process.env.TUSHARE_TOKEN || '';
const MCP_MODE = process.env.MCP_MODE === 'true' || process.argv.includes('--mcp');
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

async function main() {
  console.log('HTTP_PORT', HTTP_PORT);
  if (!TUSHARE_TOKEN) {
    console.error('错误: 请设置环境变量 TUSHARE_TOKEN');
    console.error('使用方法: export TUSHARE_TOKEN=your_token');
    process.exit(1);
  }

  // MCP模式：作为MCP服务器运行
  if (MCP_MODE) {
    // 检查是否使用HTTP传输
    const MCP_HTTP = process.env.MCP_HTTP === 'true';
    
    if (MCP_HTTP) {
      // MCP HTTP模式：使用Streamable HTTP传输
      const app = new Koa();
      const mcpServer = new TushareMCPServer(TUSHARE_TOKEN, true);

      // 中间件
      app.use(cors());
      app.use(bodyParser());

      // MCP HTTP端点
      app.use(async (ctx, next) => {
        if (ctx.path === '/mcp') {
          // 确保请求体已解析
          const req = ctx.req as any;
          req.body = ctx.request.body || ctx.body;
          
          // 设置响应为false，让MCP transport自己处理响应
          ctx.respond = false;
          
          try {
            await mcpServer.handleHttpRequest(req, ctx.res);
          } catch (error: any) {
            console.error('MCP HTTP request error:', error);
            if (!ctx.res.headersSent) {
              ctx.res.statusCode = 500;
              ctx.res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              }));
            }
          }
          return;
        }
        await next();
      });

      // 启动服务器
      app.listen(HTTP_PORT, () => {
        console.log(`Tushare MCP Streamable HTTP服务已启动，端口: ${HTTP_PORT}`);
        console.log(`MCP端点: http://localhost:${HTTP_PORT}/mcp`);
      });
    } else {
      // MCP Stdio模式：标准输入输出
      const mcpServer = new TushareMCPServer(TUSHARE_TOKEN, false);
      await mcpServer.run();
    }
    return;
  }

  // HTTP模式：作为Koa服务器运行（RESTful API）
  const app = new Koa();
  const tushareClient = new TushareClient({ token: TUSHARE_TOKEN });

  // 中间件
  app.use(cors());
  app.use(bodyParser());

  // 路由
  const router = createRoutes(tushareClient);
  app.use(router.routes()).use(router.allowedMethods());

  // 启动服务器
  app.listen(HTTP_PORT, () => {
    console.log(`Tushare MCP HTTP服务已启动，端口: ${HTTP_PORT}`);
    console.log(`健康检查: http://localhost:${HTTP_PORT}/health`);
    console.log(`实时行情: http://localhost:${HTTP_PORT}/api/realtime/:tsCode`);
    console.log(`日K线: http://localhost:${HTTP_PORT}/api/daily/:tsCode`);
    console.log(`历史K线: http://localhost:${HTTP_PORT}/api/history/:tsCode`);
  });
}

main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});
