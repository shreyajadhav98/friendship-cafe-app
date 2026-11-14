const bcrypt = require('bcryptjs');
const { getConfig } = require('../src/config/env');
const { connectDatabase } = require('../src/db/connect');
const { User } = require('../src/models');

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters) in the environment');
  await connectDatabase(getConfig().mongoUri);
  const existing = await User.findOne({ username: username.trim() });
  if (existing) throw new Error(`User ${username} already exists; refusing to overwrite credentials`);
  const user = await User.create({ username: username.trim(), passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.log(`Admin user created: ${user.username}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState) await mongoose.disconnect();
});
