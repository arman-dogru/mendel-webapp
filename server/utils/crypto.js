const crypto = require("crypto");

const SESSION_SECRET = process.env.SESSION_SECRET || "your-secret-key";
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

function encryptData(data) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // Include IV with the encrypted data
}

function decryptData(encryptedData) {
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptData,
  decryptData,
};