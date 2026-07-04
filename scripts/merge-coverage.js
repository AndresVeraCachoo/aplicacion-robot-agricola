const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const coverageDir = path.join(rootDir, 'coverage');

if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir);
}

const type = process.argv[2] || 'all';

let reports = [];

if (type === 'unit') {
  reports = [
    { path: path.join(rootDir, 'app/client/coverage/lcov.info'), prefix: 'app/client/' },
    { path: path.join(rootDir, 'app/server/coverage/unit/lcov.info'), prefix: 'app/server/' }
  ];
} else if (type === 'e2e') {
  reports = [
    { path: path.join(rootDir, 'app/server/coverage/e2e/lcov.info'), prefix: 'app/server/' }
  ];
} else {
  reports = [
    { path: path.join(rootDir, 'app/client/coverage/lcov.info'), prefix: 'app/client/' },
    { path: path.join(rootDir, 'app/server/coverage/unit/lcov.info'), prefix: 'app/server/' },
    { path: path.join(rootDir, 'app/server/coverage/e2e/lcov.info'), prefix: 'app/server/' }
  ];
}

let mergedLcov = '';
let stats = { LF: 0, LH: 0, FNF: 0, FNH: 0, BRF: 0, BRH: 0 };

reports.forEach(report => {
  if (fs.existsSync(report.path)) {
    let content = fs.readFileSync(report.path, 'utf8');
    
    const lines = content.split('\n');
    const processedLines = lines.map(line => {
      if (line.startsWith('SF:')) {
        let filePath = line.substring(3);
        const normalizedRoot = rootDir.replaceAll('\\', '/');
        const normalizedFilePath = filePath.replaceAll('\\', '/');
        
        if (normalizedFilePath.includes(normalizedRoot)) {
            filePath = normalizedFilePath.replace(normalizedRoot + '/', '');
        } else if (!filePath.startsWith(report.prefix)) {
            filePath = filePath.replace(/^[./]+/, '');
            filePath = report.prefix + filePath;
        }
        return `SF:${filePath}`;
      }
      
      // Calculate stats
      if (line.startsWith('LF:')) stats.LF += Number.parseInt(line.substring(3), 10) || 0;
      if (line.startsWith('LH:')) stats.LH += Number.parseInt(line.substring(3), 10) || 0;
      if (line.startsWith('FNF:')) stats.FNF += Number.parseInt(line.substring(4), 10) || 0;
      if (line.startsWith('FNH:')) stats.FNH += Number.parseInt(line.substring(4), 10) || 0;
      if (line.startsWith('BRF:')) stats.BRF += Number.parseInt(line.substring(4), 10) || 0;
      if (line.startsWith('BRH:')) stats.BRH += Number.parseInt(line.substring(4), 10) || 0;
      
      return line;
    });
    
    mergedLcov += processedLines.join('\n') + '\n';
  }
});

fs.writeFileSync(path.join(coverageDir, 'lcov.info'), mergedLcov);
console.log('Cobertura fusionada exitosamente en /coverage/lcov.info');

// Helper to calculate percentage
const getPercent = (hit, found) => found === 0 ? '100.00' : ((hit / found) * 100).toFixed(2);

console.log('\nResumen de Cobertura Global Unificado:');
console.log('--------------------------------------------------');
console.log(`- Líneas:    ${getPercent(stats.LH, stats.LF)}% (${stats.LH}/${stats.LF})`);
console.log(`- Funciones: ${getPercent(stats.FNH, stats.FNF)}% (${stats.FNH}/${stats.FNF})`);
console.log(`- Ramas:     ${getPercent(stats.BRH, stats.BRF)}% (${stats.BRH}/${stats.BRF})`);
console.log('--------------------------------------------------\n');
