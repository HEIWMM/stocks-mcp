import axios from 'axios';

export interface FreeKLineData {
  trade_time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  vol: number;
  amount?: number;
}

/**
 * 免费股票数据 API 客户端 (新浪财经)
 */
export class FreeStockClient {
  /**
   * 获取分时数据 (1min, 5min, 15min, 30min, 60min)
   */
  async getStkMins(tsCode: string, freq: string = '1min'): Promise<FreeKLineData[]> {
    try {
      const [code, exchange] = tsCode.split('.');
      const symbol = exchange.toLowerCase() + code;
      
      // freq 映射: 1min -> 1, 5min -> 5, 15min -> 15, 30min -> 30, 60min -> 60
      const freqMap: Record<string, string> = {
        '1min': '1',
        '5min': '5',
        '15min': '15',
        '30min': '30',
        '60min': '60'
      };
      
      const scale = freqMap[freq] || '1';
      // 新浪财经 API
      const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${scale}&ma=no&datalen=240`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://finance.sina.com.cn/',
        },
        timeout: 10000,
      });
      
      const data = response.data;
      
      if (!Array.isArray(data)) {
        console.error('新浪 API 返回数据格式不正确:', data);
        return [];
      }
      
      return data.map((item: any) => {
        // 新浪返回格式: { day: "2024-03-21 15:00:00", open: "10.00", high: "10.10", low: "9.90", close: "10.05", volume: "123456" }
        return {
          trade_time: item.day,
          open: parseFloat(item.open),
          close: parseFloat(item.close),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          vol: parseFloat(item.volume),
        };
      });
    } catch (error) {
      console.error('获取新浪财经分时数据失败:', error);
      return [];
    }
  }
}
