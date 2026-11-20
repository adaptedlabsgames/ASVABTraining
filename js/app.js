// One-page router. Views by address hash:
//   (none) home · #test timed test · #progress progress · #ar etc. practice
import { renderHome } from './home.js';
import { renderPractice, leavePractice } from './practice.js';
import { renderTest, leaveTest } from './test.js';
import { renderProgress, leaveProgress } from './progress.js';

const app = document.getElementById('app');

function route() {
  const id = location.hash.slice(1);
  leavePractice();
  leaveTest();
  leaveProgress();
  if (id === 'test') renderTest(app);
  else if (id === 'progress') renderProgress(app);
  else if (id) renderPractice(app, id);
  else renderHome(app);

  // Mark the current page in the header navigation.
  document.querySelectorAll('.site-nav a').forEach((a) => {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
route();
