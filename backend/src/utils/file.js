const logger = require('../config/logger');

const HTTP_URL_REGEX = /^https?:\/\//i;

const normalizeFilePath = (value = '') => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\\/g, '/').trim();
};

const ensureLeadingSlash = (value) => {
  if (!value) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

const buildFileUrl = (req, filePath) => {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) return null;
  if (HTTP_URL_REGEX.test(normalized)) {
    return normalized;
  }

  const baseUrl = process.env.FILE_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${ensureLeadingSlash(normalized)}`;
};

const extractStoragePath = (filePath) => {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) return null;

  if (HTTP_URL_REGEX.test(normalized)) {
    try {
      const url = new URL(normalized);
      return ensureLeadingSlash(normalizeFilePath(url.pathname));
    } catch (error) {
      logger.warn('图片地址解析失败，使用原始值', {
        filePath,
        error: error.message,
      });
      return ensureLeadingSlash(normalized);
    }
  }

  return ensureLeadingSlash(normalized);
};

module.exports = {
  HTTP_URL_REGEX,
  normalizeFilePath,
  ensureLeadingSlash,
  buildFileUrl,
  extractStoragePath,
};
