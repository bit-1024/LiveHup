const bcrypt = require('bcryptjs');

// 用户密码加密相关工具
const SALT_ROUNDS = parseInt(process.env.USER_PASSWORD_SALT_ROUNDS || '10', 10);
const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || '123456';

/**
 * 默认用户密码相关工具。
 * 为了在创建/重置用户时避免重复计算，这里预先生成一个默认密码的哈希。
 */
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_USER_PASSWORD, SALT_ROUNDS);

// 生成密码哈希
const hashPassword = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS);

// 校验密码
const comparePassword = (plainText, hash) => bcrypt.compare(plainText, hash);

module.exports = {
  SALT_ROUNDS,
  DEFAULT_USER_PASSWORD,
  DEFAULT_PASSWORD_HASH,
  hashPassword,
  comparePassword,
};

