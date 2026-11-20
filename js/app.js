// One-page router: "#ar" opens practice for that subtest, no hash shows home.
import { renderHome } from './home.js';
import { renderPractice, leavePractice } from './practice.js';

const app = document.getElementById('app');

function route() {
  const id = location.hash.slice(1);
  leavePractice();
  if (id) renderPractice(app, id);
  else renderHome(app);
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
route();
