import { server } from '../../src/index.js';
import { runSeed } from '../../src/scripts/seed.js';

const PORT = process.env.PORT || 3002;

async function start() {
    try {
        await runSeed();
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`[Servidor] Escuchando conexiones en el puerto ${PORT}`);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
await start();
