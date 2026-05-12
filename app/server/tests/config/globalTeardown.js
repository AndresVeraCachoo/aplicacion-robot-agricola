// app/server/tests/e2e/globalTeardown.js
const globalTeardown = async () => {
  console.log("\n[Global Teardown] Apagando y destruyendo el contenedor Docker maestro...");
  const container = globalThis.__POSTGRES_CONTAINER__;
  
  if (container) {
    await container.stop();
    console.log("[Global Teardown] Todo limpio.");
  }
};
export default globalTeardown;