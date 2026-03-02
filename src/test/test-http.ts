#!/usr/bin/env node

/**
 * HTTP API测试文件
 * 用于测试Koa HTTP服务器的API接口
 * 
 * 使用方法：
 * 1. 先启动HTTP服务器: npm start
 * 2. 在另一个终端运行: npm run test:http
 */

import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestCase {
  name: string;
  method: 'GET' | 'POST';
  url: string;
  expectedStatus?: number;
}

const testCases: TestCase[] = [
  {
    name: '健康检查',
    method: 'GET',
    url: `${BASE_URL}/health`,
    expectedStatus: 200,
  },
  {
    name: '获取实时行情 - 000001.SZ',
    method: 'GET',
    url: `${BASE_URL}/api/realtime/000001.SZ`,
    expectedStatus: 200,
  },
  {
    name: '获取日K线 - 最近10条',
    method: 'GET',
    url: `${BASE_URL}/api/daily/000001.SZ?limit=10`,
    expectedStatus: 200,
  },
  {
    name: '获取日K线 - 指定日期范围',
    method: 'GET',
    url: `${BASE_URL}/api/daily/600000.SH?start_date=20240101&end_date=20240131`,
    expectedStatus: 200,
  },
  {
    name: '获取周K线',
    method: 'GET',
    url: `${BASE_URL}/api/history/000001.SZ?period=weekly&limit=5`,
    expectedStatus: 200,
  },
  {
    name: '获取月K线',
    method: 'GET',
    url: `${BASE_URL}/api/history/000001.SZ?period=monthly&limit=5`,
    expectedStatus: 200,
  },
];

async function runTests() {
  console.log('🚀 开始测试HTTP API...\n');
  console.log(`📍 测试服务器: ${BASE_URL}\n`);
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 ${testCase.name}`);
      console.log(`   ${testCase.method} ${testCase.url}`);
      console.log('-'.repeat(60));

      const startTime = Date.now();
      const response = await axios({
        method: testCase.method,
        url: testCase.url,
        timeout: 30000,
      });
      const duration = Date.now() - startTime;

      // 检查状态码
      if (testCase.expectedStatus && response.status !== testCase.expectedStatus) {
        throw new Error(
          `期望状态码 ${testCase.expectedStatus}，实际得到 ${response.status}`
        );
      }

      // 显示响应信息
      console.log(`✅ 状态码: ${response.status}`);
      console.log(`⏱️  响应时间: ${duration}ms`);

      if (response.data) {
        if (response.data.success !== undefined) {
          console.log(`📊 成功: ${response.data.success}`);
        }
        if (response.data.count !== undefined) {
          console.log(`📈 数据条数: ${response.data.count}`);
        }
        if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            console.log(`📦 返回数组，长度: ${response.data.data.length}`);
            if (response.data.data.length > 0) {
              console.log('   第一条数据示例:');
              console.log(JSON.stringify(response.data.data[0], null, 4).split('\n').slice(0, 5).join('\n') + '...');
            }
          } else {
            console.log('📦 返回对象:');
            console.log(JSON.stringify(response.data.data, null, 2).split('\n').slice(0, 10).join('\n') + '...');
          }
        }
      }

      passed++;
      console.log(`✅ ${testCase.name} - 通过`);
    } catch (error: any) {
      failed++;
      console.error(`❌ ${testCase.name} - 失败`);
      if (error.response) {
        console.error(`   状态码: ${error.response.status}`);
        console.error(`   错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.error(`   请求失败: 无法连接到服务器 ${BASE_URL}`);
        console.error(`   请确保HTTP服务器已启动: npm start`);
      } else {
        console.error(`   错误: ${error.message}`);
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
    if (failed === testCases.length) {
      console.log('\n💡 提示: 请确保HTTP服务器已启动');
      console.log('   运行: npm start');
    }
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
