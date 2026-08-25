import { createServer } from 'node:http';
import { createApp } from './app';

async function startServer() {
  const app = createApp({ upstreamApiBaseUrl: process.env.HOSTGRAPH_UPSTREAM_API });
  const server = createServer(app);
  const port = Number(process.env.PORT ?? 3000);

  server.listen(port, () => {
    console.log(`HostGraph listening on ${port}`);
  });
}

startServer().catch((error) => {
  console.error('HostGraph failed to start', error);
  process.exitCode = 1;
});
