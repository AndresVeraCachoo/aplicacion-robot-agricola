import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import globalSetup from './globalSetup.js';
import globalTeardown from './globalTeardown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loadTestsDir = path.join(__dirname, '../load');

function checkK6Installed() {
    const result = spawnSync('k6', ['version'], { shell: process.platform === 'win32' }); // NOSONAR
    return result.status === 0;
}

async function runK6Script(scriptName, testPort) {
    const scriptPath = path.join(loadTestsDir, scriptName);
    const hasK6 = checkK6Installed();
    
    console.log(`\n--- Ejecutando prueba: ${scriptName} ---`);
    let k6Process;
    let stdoutData = '';
    if (hasK6) {
        k6Process = spawn('k6', ['run', '-e', `K6_BASE_URL=http://127.0.0.1:${testPort}/api`, scriptPath], { // NOSONAR
            stdio: ['ignore', 'pipe', 'inherit'],
            shell: process.platform === 'win32',
            env: { // NOSONAR
                ...process.env,
                K6_BASE_URL: `http://127.0.0.1:${testPort}/api`
            }
        });
    } else {
        console.log('[Orquestador] K6 no está instalado localmente. Usando imagen Docker (grafana/k6)...');
        const dockerArgs = [
            'run', '--rm', '-i',
            '-e', `K6_BASE_URL=http://host.docker.internal:${testPort}/api`,
            'grafana/k6', 'run', '-'
        ];
        
        k6Process = spawn('docker', dockerArgs, { // NOSONAR
            stdio: ['pipe', 'pipe', 'inherit'],
            shell: process.platform === 'win32'
        });

        const scriptContent = await fs.readFile(scriptPath, 'utf8');
        k6Process.stdin.write(scriptContent);
        k6Process.stdin.end();
    }

    k6Process.stdout.on('data', (data) => {
        process.stdout.write(data);
        stdoutData += data.toString();
    });

    return new Promise((resolve, reject) => {
        k6Process.on('error', (err) => {
            console.error(`[Orquestador] Error al arrancar el proceso de K6/Docker: ${err.message}`);
            reject(err);
        });
        k6Process.on('close', (code) => {
            // Extraer métricas con expresiones regulares
            const p95Match = /p\(95\)=([\d.]+m?s)/.exec(stdoutData);
            const reqsMatch = /http_reqs\.+:\s(\d+)/.exec(stdoutData);
            const failsMatch = /http_req_failed\.+:\s([\d.]+)%/.exec(stdoutData);
            
            const stats = {
                script: scriptName,
                p95: p95Match ? p95Match[1] : 'N/A',
                requests: reqsMatch ? reqsMatch[1] : '0',
                failureRate: failsMatch ? `${failsMatch[1]}%` : '0.00%',
                status: code === 0 ? 'PASS' : 'FAIL'
            };

            if (code === 0) {
                resolve(stats);
            } else {
                const error = new Error(`k6/docker terminó con código de error ${code}`);
                error.stats = stats;
                reject(error);
            }
        });
    });
}

async function startTestServer(testPort) {
    console.log('\n[Orquestador] Iniciando el servidor backend...');
    const env = { 
        ...process.env, 
        PORT: testPort,
        NODE_ENV: 'test' 
    };
    
    const serverProcess = spawn('node', [path.join(__dirname, 'k6-server.js')], { env, stdio: 'pipe' }); // NOSONAR
    
    await new Promise((resolve, reject) => {
        let isReady = false;
        
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Backend]: ${output.trim()}`);
            if (output.includes('Servidor corriendo') || output.includes('conectada con éxito') || output.includes('Escuchando conexiones')) {
                if (!isReady) {
                    isReady = true;
                    setTimeout(resolve, 1000); 
                }
            }
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.error(`[Backend Error]: ${data.toString().trim()}`);
        });

        serverProcess.on('close', (code) => {
            if (!isReady) reject(new Error(`El servidor se cerró antes de arrancar (código ${code})`));
        });
        
        setTimeout(() => {
            if (!isReady) {
                isReady = true;
                resolve();
            }
        }, 30000);
    });

    return serverProcess;
}

async function executeAllTests(testPort) {
    const files = await fs.readdir(loadTestsDir);
    const testFiles = files.filter(f => f.endsWith('.load.js'));
    if (testFiles.length === 0) {
        console.log('[Orquestador] No se encontraron pruebas de carga.');
        return;
    }
    
    let hasErrors = false;
    const allStats = [];
    for (const file of testFiles) {
        try {
            const stats = await runK6Script(file, testPort);
            allStats.push(stats);
        } catch (error_) {
            console.error(`\n[Orquestador] La prueba ${file} ha fallado: ${error_.message}`);
            hasErrors = true;
            if (error_.stats) allStats.push(error_.stats);
        }
    }
    
    console.log('\n======================================================');
    console.log('                 RESUMEN GLOBAL DE CARGA                ');
    console.log('======================================================');
    console.table(allStats);

    if (hasErrors) {
        throw new Error("Una o más pruebas de carga fallaron. Revisa los logs de arriba.");
    }
}

async function executeSingleTest(scriptArg, testPort) {
    try {
        const stats = await runK6Script(scriptArg, testPort);
        console.table([stats]);
    } catch (error_) {
        if (error_.stats) console.table([error_.stats]);
        throw error_;
    }
}

async function executeTests(scriptArg, testPort) {
    if (scriptArg === 'all') {
        await executeAllTests(testPort);
    } else {
        await executeSingleTest(scriptArg, testPort);
    }
}

async function run() {
  const scriptArg = process.argv[2];
  if (!scriptArg) {
    console.error('Por favor, proporciona el nombre del script de k6 a ejecutar o "all" para todos. Ejemplo: node run-k6.js main.load.test.js');
    process.exit(1);
  }

  let serverProcess;
  let isCleaningUp = false;

  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    console.log('\n[Orquestador] Apagando el servidor backend y limpiando contenedores...');
    if (serverProcess) {
        serverProcess.kill();
    }
    await globalTeardown();
    console.log('[Orquestador] Limpieza completada. Saliendo.\n');
    process.exit(process.exitCode || 0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', async (err) => {
      console.error(err);
      process.exitCode = 1;
      await cleanup();
  });

  try {
    await globalSetup();
    const testPort = 3002; 
    serverProcess = await startTestServer(testPort);

    console.log(`[Orquestador] Servidor levantado en el puerto ${testPort}. Ejecutando k6...`);
    await executeTests(scriptArg, testPort);

  } catch (error) {
    console.error('\n[Orquestador] Error durante la ejecución:', error.message);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

await run();
