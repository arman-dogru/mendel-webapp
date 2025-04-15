const crypto = require("crypto");

const SESSION_SECRET = process.env.SESSION_SECRET || "your-secret-key";

function encryptData(data) {
  const cipher = crypto.createCipher("aes-256-cbc", SESSION_SECRET);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptData(encryptedData) {
  const decipher = crypto.createDecipher("aes-256-cbc", SESSION_SECRET);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptData,
  decryptData,
};
