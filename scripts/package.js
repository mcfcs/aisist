const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const runtime = ['eagle.jpg', 'manifest.json', 'background.js', 'content.js', 'popup.html', 'lib/core.js', 'lib/syllabus.js'];
const out = path.resolve('dist/aisis-course-companion');
for (const file of runtime) {
  const dest = path.join(out, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest);
}
fs.copyFileSync('README.md', path.join(out, 'README.md'));
fs.copyFileSync('DESIGN.md', path.join(out, 'DESIGN.md'));
if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Compress-Archive -Path "dist/aisis-course-companion/*" -DestinationPath "dist/aisis-course-companion.zip" -Force'], { stdio: 'inherit' });
  console.log('Created dist/aisis-course-companion.zip');
}
console.log(`Load unpacked: ${out}`);
