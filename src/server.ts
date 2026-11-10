import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

const server = app.listen(config.PORT, () => console.log(`API listening on port ${config.PORT}`));

async function shutdown() {
  server.close(() => undefined);
  await prisma.$disconnect();
}
process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
