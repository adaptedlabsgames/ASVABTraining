// One-page router: "#test" opens the timed test, "#ar" (etc.) opens
// practice for that subtest, and no hash shows home.
import { renderHome } from './home.js';
import { renderPractice, leavePractice } from './practice.js';
import { renderTest, leaveTest } from './test.js';

const app = document.getElementById('app');

function route() {
  const id = location.hash.slice(1);
  leavePractice();
  leaveTest();
  if (id === 'test') renderTest(app);
  else if (id) renderPractice(app, id);
  else renderHome(app);
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
route();
