// One-page router. Views by address hash:
//   (none) home · #test timed test · #progress progress
//   #guides guide index · #guide-<subtest>-<topic> one guide
//   #flashcards vocabulary · #plan study plan from a score report
//   #ar, #mk, #wk, #pc (etc.) practice
import { renderHome } from './home.js';
import { renderPractice, leavePractice } from './practice.js';
import { renderTest, leaveTest } from './test.js';
import { renderProgress, leaveProgress } from './progress.js';
import { renderGuides, renderGuide, leaveGuides, parseGuideRoute } from './guides.js';
import { renderFlashcards, leaveFlashcards } from './flashcards.js';
import { renderPlan } from './plan.js';

const app = document.getElementById('app');

function route() {
  const id = location.hash.slice(1);
  leavePractice();
  leaveTest();
  leaveProgress();
  leaveGuides();
  leaveFlashcards();

  const guide = parseGuideRoute(id);
  if (id === 'test') renderTest(app);
  else if (id === 'progress') renderProgress(app);
  else if (id === 'guides') renderGuides(app);
  else if (guide) renderGuide(app, guide.subtestId, guide.topicId);
  else if (id === 'flashcards') renderFlashcards(app);
  else if (id === 'plan') renderPlan(app);
  else if (id) renderPractice(app, id);
  else renderHome(app);

  // Mark the current section in the header navigation.
  const section = guide ? 'guides' : id;
  document.querySelectorAll('.site-nav a').forEach((a) => {
    if (a.getAttribute('href') === `#${section}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
route();
