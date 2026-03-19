require('dotenv').config();

const app = require('./app');
const { connectDb } = require('./config/db');
const { validateBackendEnv } = require('./config/env');

const port = Number(process.env.PORT || 4040);

async function bootstrap() {
  validateBackendEnv();
  await connectDb();
  const server = app.listen(port, () => {
    console.log(`draftkit-backend listening on ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Set a different PORT in backend/.env and update frontend NEXT_PUBLIC_DRAFTKIT_API_URL.`
      );
      process.exit(1);
    }

    console.error('Server error:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start draftkit-backend', error);
  process.exit(1);
});
