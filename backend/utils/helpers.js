/**
 * Helper Utility Functions
 */

const crypto = require('crypto');

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
exports.generateRandomString = (length = 20) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Format date to readable string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
exports.formatDate = (date) => {
  return new Date(date).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

/**
 * Calculate time remaining
 * @param {Date} endDate - End date
 * @returns {Object} Time remaining object
 */
exports.timeRemaining = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total: diff };
};

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone
 */
exports.formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +254 XXX XXX XXX
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+254 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  return phone;
};

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated string
 */
exports.truncate = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

/**
 * Mask wallet address
 * @param {string} address - Wallet address
 * @returns {string} Masked address
 */
exports.maskAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
exports.percentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
exports.groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Sleep for milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Parse CSV to array
 * @param {string} csv - CSV string
 * @returns {Array} Parsed array
 */
exports.parseCSV = (csv) => {
  return csv.split('\n').map(row => row.split(','));
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
exports.sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9.]/gi, '_')
    .toLowerCase();
};