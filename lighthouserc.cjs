// Mobile Lighthouse on the built pages; fails below the spec's quality bar. Reports stay local (.lighthouseci/).
module.exports = {
  ci: {
    // Every built page is found and tested (no cap), so a new page cannot skip the budgets.
    collect: { staticDistDir: './dist', maxAutodiscoverUrls: 0, numberOfRuns: 1 },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-byte-weight': ['error', { maxNumericValue: 1000000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
