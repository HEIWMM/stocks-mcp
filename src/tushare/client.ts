import axios, { AxiosInstance } from 'axios';
import { FreeStockClient } from './free-api.js';

export interface TushareConfig {
  token: string;
  baseURL?: string;
}

export interface StockRealtimeData {
  ts_code: string;
  name: string;
  price: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
  [key: string]: any;
}

export interface KLineData {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  amount: number;
  [key: string]: any;
}

export class TushareClient {
  private client: AxiosInstance;
  private token: string;
  private freeClient: FreeStockClient;

  constructor(config: TushareConfig) {
    this.token = config.token;
    this.client = axios.create({
      baseURL: config.baseURL || 'http://api.tushare.pro',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.freeClient = new FreeStockClient();
  }

  /**
   * 调用Tushare API
   */
  private async callAPI(
    apiName: string, 
    params: Record<string, any>, 
    fields?: string
  ): Promise<any> {
    try {
      const response = await this.client.post('', {
        api_name: apiName,
        token: this.token,
        params: params,
        fields: fields || '',
      });
      
      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(`Tushare API错误: ${response.data.msg || '未知错误'}`);
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(`调用Tushare API失败: ${error.response.data?.msg || error.message}`);
      }
      throw new Error(`调用Tushare API失败: ${error.message}`);
    }
  }

  /**
   * 获取股票实时行情（获取最新交易日的数据）
   */
  async getRealtimeQuote(tsCode: string): Promise<StockRealtimeData | null> {
    try {
      // 获取最近一个交易日的数据作为实时行情
      const data = await this.callAPI('daily', {
        ts_code: tsCode,
      }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount');

      if (data && data.items && data.items.length > 0) {
        // 取第一条数据（最新的）
        const latest = data.items[0];
        const fields = data.fields || [];
        
        const result: any = {
          ts_code: tsCode,
        };
        
        fields.forEach((field: string, index: number) => {
          result[field] = latest[index];
        });

        return result as StockRealtimeData;
      }
      return null;
    } catch (error: any) {
      throw new Error(`获取实时行情失败: ${error.message}`);
    }
  }

  /**
   * 获取日K线数据
   */
  async getDailyKLine(
    tsCode: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<KLineData[]> {
    try {
      const params: Record<string, any> = {
        ts_code: tsCode,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await this.callAPI('daily', params, 
        'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount');

      if (data && data.items) {
        const fields = data.fields || [];
        let results: KLineData[] = data.items.map((item: any[]) => {
          const result: any = {};
          fields.forEach((field: string, index: number) => {
            result[field] = item[index];
          });
          return result as KLineData;
        });

        // 按日期倒序排列（最新的在前）
        results = results.sort((a, b) => 
          b.trade_date.localeCompare(a.trade_date)
        );

        // 限制返回数量
        if (limit && limit > 0) {
          results = results.slice(0, limit);
        }

        return results;
      }
      return [];
    } catch (error: any) {
      throw new Error(`获取日K线数据失败: ${error.message}`);
    }
  }

  /**
   * 获取当日实时分时走势
   */
  async getStkMins(
    tsCode: string,
    freq: string = '1min'
  ): Promise<any[]> {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const startStr = `${dateStr} 09:00:00`;
      const endStr = `${dateStr} 16:00:00`;

      const data = await this.callAPI('stk_mins', {
        ts_code: tsCode,
        freq: freq,
        start_date: startStr,
        end_date: endStr,
      }, 'ts_code,trade_time,open,close,high,low,vol,amount');

      if (data && data.items && data.items.length > 0) {
        const fields = data.fields || [];
        return data.items.map((item: any[]) => {
          const result: any = {};
          fields.forEach((field: string, index: number) => {
            result[field] = item[index];
          });
          return result;
        });
      }
      
      // 如果 Tushare 没有数据，尝试使用免费 API
      console.log(`Tushare stk_mins 返回空数据，尝试使用免费 API 获取 ${tsCode}`);
      return await this.freeClient.getStkMins(tsCode, freq);
    } catch (error: any) {
      // 如果 stk_mins 权限不足，尝试使用免费 API
      if (error.message.includes('权限') || error.message.includes('积分')) {
        console.log(`Tushare stk_mins 权限不足，正在使用免费 API 获取 ${tsCode}`);
        return await this.freeClient.getStkMins(tsCode, freq);
      }
      throw new Error(`获取分时走势失败: ${error.message}`);
    }
  }

  /**
   * 获取股票基本信息（包含股票名称）
   */
  async getStockName(tsCode: string): Promise<string | null> {
    try {
      const data = await this.callAPI('stock_basic', {
        ts_code: tsCode,
      }, 'ts_code,symbol,name,area,industry,market,list_date');

      if (data && data.items && data.items.length > 0) {
        const latest = data.items[0];
        const fields = data.fields || [];
        const nameIndex = fields.indexOf('name');
        
        if (nameIndex !== -1) {
          return latest[nameIndex];
        }
      }
      return null;
    } catch (error: any) {
      throw new Error(`获取股票名称失败: ${error.message}`);
    }
  }

  /**
   * 获取历史K线数据（支持周K、月K等）
   */
  async getHistoryKLine(
    tsCode: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<KLineData[]> {
    try {
      const apiName = period === 'daily' ? 'daily' : 
                     period === 'weekly' ? 'weekly' : 'monthly';
      
      const params: Record<string, any> = {
        ts_code: tsCode,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await this.callAPI(apiName, params,
        'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount');

      if (data && data.items) {
        const fields = data.fields || [];
        let results: KLineData[] = data.items.map((item: any[]) => {
          const result: any = {};
          fields.forEach((field: string, index: number) => {
            result[field] = item[index];
          });
          return result as KLineData;
        });

        // 按日期倒序排列
        results = results.sort((a, b) => 
          b.trade_date.localeCompare(a.trade_date)
        );

        if (limit && limit > 0) {
          results = results.slice(0, limit);
        }

        return results;
      }
      return [];
    } catch (error: any) {
      throw new Error(`获取历史K线数据失败: ${error.message}`);
    }
  }
}
