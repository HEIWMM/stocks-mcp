import Router from 'koa-router';
import { TushareClient } from '../tushare/client.js';

export function createRoutes(tushareClient: TushareClient): Router {
  const router = new Router();

  /**
   * 获取股票实时行情
   * GET /api/realtime/:tsCode
   */
  router.get('/api/realtime/:tsCode', async (ctx) => {
    try {
      const { tsCode } = ctx.params;
      const data = await tushareClient.getRealtimeQuote(tsCode);
      
      if (!data) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: `未找到股票 ${tsCode} 的实时行情数据`,
        };
        return;
      }

      ctx.body = {
        success: true,
        data,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  });

  /**
   * 获取日K线数据
   * GET /api/daily/:tsCode
   * Query params: start_date, end_date, limit
   */
  router.get('/api/daily/:tsCode', async (ctx) => {
    try {
      const { tsCode } = ctx.params;
      const { start_date, end_date, limit } = ctx.query;
      
      const data = await tushareClient.getDailyKLine(
        tsCode,
        start_date as string | undefined,
        end_date as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );

      ctx.body = {
        success: true,
        data,
        count: data.length,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  });

  /**
   * 获取历史K线数据
   * GET /api/history/:tsCode
   * Query params: period, start_date, end_date, limit
   */
  router.get('/api/history/:tsCode', async (ctx) => {
    try {
      const { tsCode } = ctx.params;
      const { period, start_date, end_date, limit } = ctx.query;
      
      const data = await tushareClient.getHistoryKLine(
        tsCode,
        (period as 'daily' | 'weekly' | 'monthly') || 'daily',
        start_date as string | undefined,
        end_date as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );

      ctx.body = {
        success: true,
        data,
        count: data.length,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  });

  /**
   * 健康检查
   * GET /health
   */
  router.get('/health', async (ctx) => {
    ctx.body = {
      success: true,
      message: 'Tushare MCP服务运行正常',
      timestamp: new Date().toISOString(),
    };
  });

  return router;
}
