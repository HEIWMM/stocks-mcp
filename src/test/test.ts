#!/usr/bin/env node

/**
 * Tushare MCP服务测试文件
 * 用于测试Tushare API集成和MCP服务功能
 */

import 'dotenv/config';
import { TushareClient } from '../tushare/client.js';

// 从环境变量获取Token
const TUSHARE_TOKEN = process.env.TUSHARE_TOKEN || '';

async function testTushareClient() {
  console.log('TUSHARE_TOKEN', process.env);
  if (!TUSHARE_TOKEN) {
    console.error('❌ 错误: 请设置环境变量 TUSHARE_TOKEN');
    console.error('使用方法: export TUSHARE_TOKEN=your_token');
    process.exit(1);
  }

  console.log('🚀 开始测试Tushare MCP服务...\n');
  console.log('='.repeat(60));

  const client = new TushareClient({ token: TUSHARE_TOKEN });

  // 测试用例
  const testCases = [
    {
      name: '测试1: 获取实时行情',
      test: async () => {
        const tsCode = '000001.SZ'; // 平安银行
        console.log(`\n📊 测试股票: ${tsCode}`);
        const data = await client.getRealtimeQuote(tsCode);
        if (data) {
          console.log('✅ 实时行情获取成功:');
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('⚠️  未找到数据');
        }
      },
    },
    {
      name: '测试2: 获取日K线数据（最近10条）',
      test: async () => {
        const tsCode = '000001.SZ';
        console.log(`\n📈 测试股票: ${tsCode}`);
        const data = await client.getDailyKLine(tsCode, undefined, undefined, 10);
        console.log(`✅ 获取到 ${data.length} 条日K线数据`);
        if (data.length > 0) {
          console.log('最新一条数据:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      },
    },
    {
      name: '测试3: 获取日K线数据（指定日期范围）',
      test: async () => {
        const tsCode = '600000.SH'; // 浦发银行
        const startDate = '20240101';
        const endDate = '20240131';
        console.log(`\n📅 测试股票: ${tsCode}, 日期范围: ${startDate} - ${endDate}`);
        const data = await client.getDailyKLine(tsCode, startDate, endDate);
        console.log(`✅ 获取到 ${data.length} 条日K线数据`);
        if (data.length > 0) {
          console.log('第一条数据:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      },
    },
    {
      name: '测试4: 获取周K线数据',
      test: async () => {
        const tsCode = '000001.SZ';
        console.log(`\n📊 测试股票: ${tsCode}, 周期: 周K`);
        const data = await client.getHistoryKLine(tsCode, 'weekly', undefined, undefined, 5);
        console.log(`✅ 获取到 ${data.length} 条周K线数据`);
        if (data.length > 0) {
          console.log('最新一条数据:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      },
    },
    {
      name: '测试5: 获取月K线数据',
      test: async () => {
        const tsCode = '000001.SZ';
        console.log(`\n📊 测试股票: ${tsCode}, 周期: 月K`);
        const data = await client.getHistoryKLine(tsCode, 'monthly', undefined, undefined, 5);
        console.log(`✅ 获取到 ${data.length} 条月K线数据`);
        if (data.length > 0) {
          console.log('最新一条数据:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      },
    },
  ];

  // 运行测试
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n${testCase.name}`);
      console.log('-'.repeat(60));
      await testCase.test();
      passed++;
      console.log(`✅ ${testCase.name} - 通过`);
    } catch (error: any) {
      failed++;
      console.error(`❌ ${testCase.name} - 失败`);
      console.error(`错误信息: ${error.message}`);
      if (error.stack) {
        console.error('堆栈跟踪:');
        console.error(error.stack);
      }
    }
  }

  // 测试总结
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试总结:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 总计: ${passed + failed}`);
  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
    process.exit(1);
  }
}

// 运行测试
testTushareClient().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
