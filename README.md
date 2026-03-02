# Tushare MCP服务

基于Tushare API的MCP（Model Context Protocol）服务，提供股票实时股价、日K、历史K线查看功能。

## 技术栈

- **框架**: Koa + TypeScript + Vite
- **数据源**: Tushare API
- **协议**: MCP (Model Context Protocol)

## 功能

1. **实时股价查看** - 获取股票最新行情数据
2. **日K线查看** - 获取股票日K线数据
3. **历史K线查看** - 获取股票历史K线数据（支持日K、周K、月K）

## 安装

```bash
npm install
```

## 配置

### 获取Tushare Token

1. 访问 [Tushare官网](https://tushare.pro/)
2. 注册账号并获取API Token

### 设置环境变量

```bash
# Windows
set TUSHARE_TOKEN=your_token_here

# Linux/Mac
export TUSHARE_TOKEN=your_token_here
```

## 使用方式

### 方式一：MCP服务器模式

作为MCP服务器运行，供MCP客户端调用：

```bash
# 设置环境变量
export TUSHARE_TOKEN=your_token

# 运行MCP服务器
npm start -- --mcp
# 或
MCP_MODE=true npm start
```

### 方式二：HTTP API模式

作为HTTP服务器运行，提供RESTful API：

```bash
# 设置环境变量
export TUSHARE_TOKEN=your_token
export HTTP_PORT=3000  # 可选，默认3000

# 运行HTTP服务器
npm start
```

## API接口

### 1. 健康检查

```
GET /health
```

### 2. 获取实时行情

```
GET /api/realtime/:tsCode
```

**参数**:
- `tsCode`: 股票代码，格式：`000001.SZ`（深交所）或 `600000.SH`（上交所）

**示例**:
```bash
curl http://localhost:3000/api/realtime/000001.SZ
```

### 3. 获取日K线

```
GET /api/daily/:tsCode
```

**参数**:
- `tsCode`: 股票代码
- `start_date` (可选): 开始日期，格式：YYYYMMDD
- `end_date` (可选): 结束日期，格式：YYYYMMDD
- `limit` (可选): 返回数据条数限制

**示例**:
```bash
curl "http://localhost:3000/api/daily/000001.SZ?limit=10"
curl "http://localhost:3000/api/daily/000001.SZ?start_date=20240101&end_date=20240131"
```

### 4. 获取历史K线

```
GET /api/history/:tsCode
```

**参数**:
- `tsCode`: 股票代码
- `period` (可选): K线周期，可选值：`daily`（日K）、`weekly`（周K）、`monthly`（月K），默认：`daily`
- `start_date` (可选): 开始日期，格式：YYYYMMDD
- `end_date` (可选): 结束日期，格式：YYYYMMDD
- `limit` (可选): 返回数据条数限制

**示例**:
```bash
curl "http://localhost:3000/api/history/000001.SZ?period=weekly&limit=20"
curl "http://localhost:3000/api/history/600000.SH?period=monthly&start_date=20240101"
```

## MCP工具

当以MCP模式运行时，提供以下工具：

### 1. get_realtime_quote

获取股票实时行情数据

**参数**:
- `ts_code` (必需): 股票代码，格式：000001.SZ 或 600000.SH

### 2. get_daily_kline

获取股票日K线数据

**参数**:
- `ts_code` (必需): 股票代码
- `start_date` (可选): 开始日期，格式：YYYYMMDD
- `end_date` (可选): 结束日期，格式：YYYYMMDD
- `limit` (可选): 返回数据条数限制

### 3. get_history_kline

获取股票历史K线数据（支持日K、周K、月K）

**参数**:
- `ts_code` (必需): 股票代码
- `period` (可选): K线周期：daily(日K)、weekly(周K)、monthly(月K)，默认：daily
- `start_date` (可选): 开始日期，格式：YYYYMMDD
- `end_date` (可选): 结束日期，格式：YYYYMMDD
- `limit` (可选): 返回数据条数限制

## 开发

```bash
# 开发模式（需要配置vite）
npm run dev

# 类型检查
npm run type-check

# 构建
npm run build

# 运行测试（需要先设置TUSHARE_TOKEN环境变量）
npm test

# 构建后运行测试
npm run test:build

# 测试HTTP API（需要先启动HTTP服务器）
npm run test:http
```

## 股票代码格式说明

- **深交所**: `000001.SZ` (如：平安银行)
- **上交所**: `600000.SH` (如：浦发银行)
- **创业板**: `300001.SZ`
- **科创板**: `688001.SH`

## 注意事项

1. 需要有效的Tushare API Token才能使用
2. Tushare API有调用频率限制，请合理使用
3. 股票代码必须包含交易所后缀（.SZ 或 .SH）
4. 日期格式必须为 YYYYMMDD（如：20240101）

## 许可证

MIT
