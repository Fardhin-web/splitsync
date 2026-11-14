const { execSync } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('   SplitSync Production Build Process Starting');
console.log('========================================================\n');

try {
  console.log('--> Step 1: Installing backend dependencies...');
  execSync('npm --prefix server install', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });

  console.log('\n--> Step 2: Installing frontend dependencies (including Vite)...');
  execSync('npm --prefix client install --include=dev', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });

  console.log('\n--> Step 3: Compiling Vite React frontend...');
  execSync('npm --prefix client run build', { stdio: 'inherit' });

  console.log('\n========================================================');
  console.log('✅ SplitSync Build Completed Successfully!');
  console.log('========================================================');
} catch (error) {
  console.error('\n❌ Build failed with error:', error.message);
  process.exit(1);
}
