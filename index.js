const { Certificate } = require('@fidm/x509');
const axios = require('axios');
const crypto = require('crypto');
const DEFAULT_AUTH_TYPE = 'WECHATPAY2-SHA256-RSA2048'
const weixinPayAPI = axios.create({
  baseURL: 'https://api.mch.weixin.qq.com',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
});
function getSerialNo(publicKey) {
  return Certificate.fromPEM(publicKey).serialNumber;
}
const CACHED_CERTIFICATES = {};
class WechatPay {
  constructor({ appid, mchid, publicKey, privateKey, secretKey, authType }) {
    this.appid = appid;
    this.mchid = mchid;
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.secretKey = secretKey;
    this.authType = authType || DEFAULT_AUTH_TYPE;
    this.serial_no = getSerialNo(this.publicKey);
  }
  async request(method, url, body = {}) {
    const nonce_str = Math.random().toString(36).substring(2, 17);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign(method, url, nonce_str, timestamp, body);
    const headers = {
      Authorization: `${this.authType} mchid="${this.mchid}",nonce_str="${nonce_str}",timestamp="${timestamp}",serial_no="${this.serial_no}",signature="${signature}"`,
    };
    const responseData = await weixinPayAPI.request({ method, url, data: body, headers });
    return responseData.data;
  }
  sign(method, url, nonce_str, timestamp, body) {
    let data = `${method}\n${url}\n${timestamp}\n${nonce_str}\n`;
    data += (method !== 'GET' && body) ? `${JSON.stringify(body)}\n` : '\n';
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.privateKey, 'base64');
  }
  async nativePayment(params) {
    const url = '/v3/pay/transactions/native';
    const requestParams = {
      appid: this.appid,
      mchid: this.mchid,
      ...params
    };
    return await this.request('POST', url, requestParams);
  }
  async h5Payment(params) {
    const url = '/v3/pay/transactions/h5';
    const requestParams = {
      appid: this.appid,
      mchid: this.mchid,
      ...params
    };
    return await this.request('POST', url, requestParams);
  }
  async fetchWechatPayPublicKey(serial) {
    const publicKey = CACHED_CERTIFICATES[serial];
    if (publicKey) {
      return publicKey;
    }
    const url = '/v3/certificates';
    const data = await this.request('GET', url);
    data.data.forEach(item => {
      const certificate = this.decrypt(item.encrypt_certificate);
      CACHED_CERTIFICATES[item.serial_no] = Certificate.fromPEM(certificate).publicKey.toPEM();
    });
    return CACHED_CERTIFICATES[serial];
  }
  async verifySignature(params) {
    const { timestamp, nonce, body, serial, signature } = params;
    let publicKey = await this.fetchWechatPayPublicKey(serial);
    const bodyStr = JSON.stringify(body);
    const data = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'base64');
  }
  decrypt(encrypted) {
    const { ciphertext, associated_data, nonce } = encrypted;
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    const encryptedData = encryptedBuffer.subarray(0, encryptedBuffer.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associated_data));
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    const decryptedString = decrypted.toString('utf8');
    return decryptedString;
  }
  async queryOrder(params) {
    const { out_trade_no } = params;
    const url = `/v3/pay/transactions/out-trade-no/${out_trade_no}?mchid=${this.mchid}`;
    return await this.request('GET', url);
  }
  async closeOrder(params) {
    const { out_trade_no } = params;
    const url = `/v3/pay/transactions/out-trade-no/${out_trade_no}/close`;
    await this.request('POST', url, { mchid: this.mchid });
  }
  async combineH5Payment(params) {
    const url = `/v3/combine-transactions/h5`;
    return await this.request('POST', url, params);
  }
  // 申请资金账单
  async requestFundFlowBill(params){
    const { bill_date } = params;
    const url = `/v3/bill/fundflowbill?bill_date=${billDate}`;
    return await this.request('GET', url);
  }
}
module.exports = WechatPay;