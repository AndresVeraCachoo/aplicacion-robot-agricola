import scanner from 'sonarqube-scanner';

scanner(
  {
    serverUrl: 'https://sonarcloud.io', // Cambiar si usas un servidor local
    options: {
      'sonar.token': process.env.SONAR_TOKEN,
      'sonar.projectKey': 'agrirobot-dashboard',
      'sonar.sources': '.',
      // Vinculamos con tu configuración de ESLint existente
      'sonar.eslint.reportPaths': 'eslint-report.json' 
    },
  },
  () => process.exit()
);