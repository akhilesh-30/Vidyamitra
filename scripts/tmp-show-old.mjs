import { execSync } from 'child_process';
const files = ['app/dashboard/page.tsx','app/checkin/page.tsx','app/practice/page.tsx','app/progress/page.tsx','app/counsellor/page.tsx'];
for (const f of files) {
  try {
    const s = execSync('git show HEAD:' + f, { encoding: 'utf8', maxBuffer: 1024*1024 });
    console.log('=== ' + f + ' len=' + s.length + ' ===');
    console.log(s.slice(0, 4000));
    console.log('');
  } catch (e) {
    console.log('MISS ' + f + ': ' + String(e.message).slice(0, 300));
  }
}
