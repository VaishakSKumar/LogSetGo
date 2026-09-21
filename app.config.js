/**
 * Extends app.json. The only dynamic bit: when the web build is hosted under a sub-path
 * (GitHub Pages serves this repo at /LogSetGo/), set EXPO_BASE_URL=LogSetGo for the export.
 * A leading slash is optional and added here: Git Bash on Windows rewrites values that
 * start with "/" into file paths, so the slash-less form is the safe one to type.
 * Left unset, everything behaves exactly like plain app.json.
 */
const raw = (process.env.EXPO_BASE_URL || '').trim();
const baseUrl = /^[A-Za-z]:[\/]/.test(raw) ? '' : raw.replace(/^\/+|\/+$/g, '');

module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(baseUrl ? { baseUrl: `/${baseUrl}` } : {}),
  },
});
