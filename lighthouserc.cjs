// Mobile Lighthouse on the built pages; fails below the spec's quality bar. Reports stay local (.lighthouseci/).
// Three runs per page, asserted on the median: one run each let a cold start fail the build (main, 12 Nov: the first
// two pages measured, 404 and home, scored 0.72 and 0.82 for performance while every page after scored 1.0, and the
// same code had passed on its pull request minutes before). The thresholds themselves are unchanged.
const median = (options) => ['error', { ...options, aggregationMethod: 'median' }];

module.exports = {
  ci: {
    // Every built page is found and tested (no cap), so a new page cannot skip the budgets.
    collect: { staticDistDir: './dist', maxAutodiscoverUrls: 0, numberOfRuns: 3 },
    assert: {
      assertions: {
        'categories:performance': median({ minScore: 0.95 }),
        'categories:accessibility': median({ minScore: 0.95 }),
        'categories:best-practices': median({ minScore: 0.95 }),
        'categories:seo': median({ minScore: 0.95 }),
        'largest-contentful-paint': median({ maxNumericValue: 2000 }),
        'cumulative-layout-shift': median({ maxNumericValue: 0.05 }),
        'total-byte-weight': median({ maxNumericValue: 1000000 }),
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
