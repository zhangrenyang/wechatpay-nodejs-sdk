# wechatpay-nodejs-sdk

wechatpay-nodejs-sdk 是一个用于 Node.js 的微信支付集成库。它提供了简单易用的方法来与微信支付 API 进行交互，包括签名验证、发送请求、处理微信支付回调等功能。

## 功能特性

- 发送支付请求（如 Native 支付请求）
- 验证微信支付回调的签名
- 解密微信支付加密数据
- 缓存和获取微信支付公钥

## 安装

您可以通过 npm 来安装这个库：

```bash
npm install wechatpay-nodejs-sdk
```

## 快速开始

以下是一个如何使用 wechatpay-nodejs-sdk 发送支付请求和处理微信支付回调的简单示例：

```javascript
const WechatPay = require('wechatpay-nodejs-sdk');
const wechatPay = new WechatPay({
  appid: '您的微信应用ID',
  mchid: '您的微信商户ID',
  publicKey: fs.readFileSync('path/to/your/public/key.pem'),
  privateKey: fs.readFileSync('path/to/your/private/key.pem'),
  secretKey: '您的微信支付密钥'
});

// 发送 Native 支付请求
const paymentData = await wechatPay.transactions_native({
  description: '商品描述',
  out_trade_no: '订单号',
  amount: { total: 100 },
  notify_url: 'https://your.domain/notify'
});

// 验证微信支付回调的签名
router.post('/notify', async (req, res) => {
  const isVerified = await wechatPay.verifySign({
    body: req.body,
    signature: req.headers['wechatpay-signature'],
    serial: req.headers['wechatpay-serial'],
    nonce: req.headers['wechatpay-nonce'],
    timestamp: req.headers['wechatpay-timestamp']
  });
  if (isVerified) {
    // 签名验证成功的逻辑
  } else {
    // 签名验证失败的逻辑
  }
});
```

## 文档

更多详细信息，请参阅[文档](https://github.com/zhangrenyang/wechatpay-nodejs-sdk/wiki)。

## 贡献

欢迎贡献！如果您有任何改进建议或功能请求，请在 [GitHub 仓库](https://github.com/zhangrenyang/wechatpay-nodejs-sdk)中创建一个 issue。

## 许可证

此项目采用 MIT 许可证。有关详细信息，请参阅 [LICENSE](LICENSE) 文件。

