/**
 * Detiene y elimina el contenedor de base de datos utilizado durante las pruebas.
 */
const globalTeardown = async () => {
  const container = globalThis.__POSTGRES_CONTAINER__;
  const redisContainer = globalThis.__REDIS_CONTAINER__;
  
  if (container) {
    await container.stop();
    console.log("\n[E2E Teardown] Contenedor de base de datos detenido correctamente.");
  }

  if (redisContainer) {
    await redisContainer.stop();
    console.log("[E2E Teardown] Contenedor de Redis detenido correctamente.");
  }
};

export default globalTeardown;