import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  isInitializeRequest,
  JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';
import { TushareClient } from '../tushare/client.js';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
// 简单的InMemoryEventStore实现
import type { EventStore, StreamId, EventId } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

class InMemoryEventStore implements EventStore {
  private events: Array<{ streamId: StreamId; id: EventId; message: JSONRPCMessage }> = [];

  async storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId> {
    const id = randomUUID();
    this.events.push({ streamId, id, message });
    return id;
  }

  async getStreamIdForEventId(eventId: EventId): Promise<StreamId | undefined> {
    const event = this.events.find(e => e.id === eventId);
    return event?.streamId;
  }

  async replayEventsAfter(lastEventId: EventId, { send }: {
    send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
  }): Promise<StreamId> {
    const lastIndex = this.events.findIndex(e => e.id === lastEventId);
    if (lastIndex === -1) {
      throw new Error(`Event ID ${lastEventId} not found`);
    }

    const streamId = this.events[lastIndex].streamId;
    const eventsToReplay = this.events.slice(lastIndex + 1);

    for (const event of eventsToReplay) {
      if (event.streamId === streamId) {
        await send(event.id, event.message);
      }
    }

    return streamId;
  }
}

export class TushareMCPServer {
  private server: Server;
  private tushareClient: TushareClient;
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private useHttp: boolean;

  constructor(tushareToken: string, useHttp: boolean = false) {
    this.useHttp = useHttp;
    this.server = new Server(
      {
        name: 'tushare-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tushareClient = new TushareClient({ token: tushareToken });

    this.setupHandlers();
  }

  private setupHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_realtime_quote',
            description: '获取股票实时行情数据',
            inputSchema: {
              type: 'object',
              properties: {
                ts_code: {
                  type: 'string',
                  description: '股票代码，格式：000001.SZ（深交所）或 600000.SH（上交所）',
                },
              },
              required: ['ts_code'],
            },
          } as Tool,
          {
            name: 'get_daily_kline',
            description: '获取股票当日分时实时走势数据',
            inputSchema: {
              type: 'object',
              properties: {
                ts_code: {
                  type: 'string',
                  description: '股票代码，格式：000001.SZ 或 600000.SH',
                },
                freq: {
                  type: 'string',
                  enum: ['1min', '5min', '15min', '30min', '60min'],
                  description: '时间间隔：1min/5min/15min/30min/60min，默认为1min',
                  default: '1min',
                },
              },
              required: ['ts_code'],
            },
          } as Tool,
          {
            name: 'get_history_kline',
            description: '获取股票历史K线数据（支持日K、周K、月K）',
            inputSchema: {
              type: 'object',
              properties: {
                ts_code: {
                  type: 'string',
                  description: '股票代码，格式：000001.SZ 或 600000.SH',
                },
                period: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly'],
                  description: 'K线周期：daily(日K)、weekly(周K)、monthly(月K)',
                  default: 'daily',
                },
                start_date: {
                  type: 'string',
                  description: '开始日期，格式：YYYYMMDD，可选',
                },
                end_date: {
                  type: 'string',
                  description: '结束日期，格式：YYYYMMDD，可选',
                },
                limit: {
                  type: 'number',
                  description: '返回数据条数限制，可选',
                },
              },
              required: ['ts_code'],
            },
          } as Tool,
          {
            name: 'get_current_time',
            description: '获取当前服务器时间',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          } as Tool,
          {
            name: 'get_stock_name',
            description: '根据股票代码获取股票名称',
            inputSchema: {
              type: 'object',
              properties: {
                ts_code: {
                  type: 'string',
                  description: '股票代码，格式：000001.SZ 或 600000.SH',
                },
              },
              required: ['ts_code'],
            },
          } as Tool,
        ],
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_realtime_quote': {
            const { ts_code } = args as { ts_code: string };
            const data = await this.tushareClient.getRealtimeQuote(ts_code);
            
            if (!data) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `未找到股票 ${ts_code} 的实时行情数据`,
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'get_daily_kline': {
            const { ts_code, freq } = args as {
              ts_code: string;
              freq?: string;
            };
            
            const data = await this.tushareClient.getStkMins(
              ts_code,
              freq || '1min'
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'get_history_kline': {
            const { ts_code, period, start_date, end_date, limit } = args as {
              ts_code: string;
              period?: 'daily' | 'weekly' | 'monthly';
              start_date?: string;
              end_date?: string;
              limit?: number;
            };
            
            const data = await this.tushareClient.getHistoryKLine(
              ts_code,
              period || 'daily',
              start_date,
              end_date,
              limit
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'get_current_time': {
            // 使用 timeapi.io，它明确支持 CORS
            const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Shanghai');
            if (!response.ok) throw new Error('网络响应失败');
            const data = await response.json();
            // data.dateTime 格式通常为 "2026-03-03T10:27:19"
            const beijingTime = new Date(data.dateTime);
            const currentTime = beijingTime.toLocaleString('zh-CN');
            return {
              content: [
                {
                  type: 'text',
                  text: `当前服务器时间是: ${currentTime}`,
                },
              ],
            };
          }

          case 'get_stock_name': {
            const { ts_code } = args as { ts_code: string };
            const name = await this.tushareClient.getStockName(ts_code);
            
            if (!name) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `未找到股票代码 ${ts_code} 对应的股票名称`,
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `股票代码 ${ts_code} 对应的股票名称是: ${name}`,
                },
              ],
            };
          }

          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    if (this.useHttp) {
      // HTTP模式：返回HTTP处理函数，由外部HTTP服务器调用
      throw new Error('HTTP模式请使用 runHttp() 方法');
    } else {
      // Stdio模式：标准输入输出
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Tushare MCP服务器已启动 (stdio模式)');
    }
  }

  /**
   * 处理HTTP请求（用于Streamable HTTP传输）
   */
  async handleHttpRequest(
    req: IncomingMessage & { body?: any },
    res: ServerResponse
  ): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const method = req.method;
    const protocolVersion = req.headers['mcp-protocol-version'] as string | undefined;

    console.log(`[MCP HTTP] ${method} request, sessionId: ${sessionId || 'none'}, protocolVersion: ${protocolVersion || 'none'}`);

    try {
      // GET请求：处理SSE流
      if (method === 'GET') {
        if (!sessionId || !this.transports.has(sessionId)) {
          if (sessionId) {
            console.log(`[MCP HTTP] Session ${sessionId} not found or expired, creating new session for GET`);
          } else {
            console.log('[MCP HTTP] GET request without session ID, creating new session');
          }
          
          const eventStore = new InMemoryEventStore();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            eventStore,
            onsessioninitialized: (sid) => {
              console.log(`[MCP HTTP] Session initialized callback: ${sid}`);
            },
          });

          // 设置关闭处理
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && this.transports.has(sid)) {
              console.log(`Transport closed for session ${sid}`);
              this.transports.delete(sid);
            }
          };

          // 连接transport到服务器
          await this.server.connect(transport);
          
          // HACK: 强制设置transport为已初始化状态，并生成sessionId
          if ((transport as any)._webStandardTransport) {
            const webTransport = (transport as any)._webStandardTransport;
            const sid = randomUUID();
            webTransport.sessionId = sid;
            webTransport._initialized = true;
            
            // 重要：将transport存入映射表
            this.transports.set(sid, transport);
            
            console.log(`[MCP HTTP] Created and saved new session: ${sid}`);

            // 直接调用 webStandardTransport 的 handleGetRequest 并修改返回的 Response
            // 这样可以避开 validateSession 的检查
            const handler = (transport as any)._requestListener;
            // 我们依然需要让 SDK 处理请求，但我们要确保它能看到 sessionId
            // 修改 req.headers 是最直接的，如果 getRequestListener 没看到，说明它读取的是 rawHeaders 或其他地方
            req.headers['mcp-session-id'] = sid;
          }

          // 处理请求
          await transport.handleRequest(req, res);
          return;
        }
        
        console.log(`[MCP HTTP] Using existing session ${sessionId} for GET`);
        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }

      // DELETE请求：终止会话
      if (method === 'DELETE') {
        if (!sessionId || !this.transports.has(sessionId)) {
          console.warn(`[MCP HTTP] DELETE request with invalid sessionId: ${sessionId}`);
          res.statusCode = 404;
          res.end('Session not found');
          return;
        }
        console.log(`[MCP HTTP] Terminating session ${sessionId}`);
        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        this.transports.delete(sessionId);
        return;
      }

      // POST请求：处理MCP消息
      if (method === 'POST') {
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.transports.has(sessionId)) {
          console.log(`[MCP HTTP] Using existing session ${sessionId} for POST`);
          transport = this.transports.get(sessionId)!;
        } else if (!sessionId && isInitializeRequest(req.body)) {
          console.log('[MCP HTTP] Creating new session for POST initialization');
          const eventStore = new InMemoryEventStore();
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            eventStore,
            onsessioninitialized: (sid) => {
              console.log(`[MCP HTTP] POST Session initialized with ID: ${sid}`);
              this.transports.set(sid, transport);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && this.transports.has(sid)) {
              console.log(`Transport closed for session ${sid}`);
              this.transports.delete(sid);
            }
          };

          await this.server.connect(transport);
        } else {
          console.warn(`[MCP HTTP] Invalid POST request: sessionId=${sessionId}, isInit=${isInitializeRequest(req.body)}`);
          res.statusCode = 400;
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: Invalid session or missing initialization request',
            },
            id: null,
          }));
          return;
        }

        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.statusCode = 405;
      res.end('Method Not Allowed');
    } catch (error: any) {
      console.error('[MCP HTTP] Critical error:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Internal server error: ${error.message}`,
          },
          id: null,
        }));
      }
    }
  }
}
