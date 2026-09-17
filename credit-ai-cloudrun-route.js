(() => {
  const OLD_BASE = "https://must-resource-ai.f00931-must.workers.dev";
  const NEW_BASE = "https://must-isp-ai-697793258377.asia-east1.run.app";
  const nativeFetch = window.fetch.bind(window);

  function rewrite(url) {
    if (typeof url !== "string") return url;
    if (url === `${OLD_BASE}/ai/curriculum-parse`) return `${NEW_BASE}/ai/curriculum-parse`;
    if (url === `${OLD_BASE}/ai/transcript-parse`) return `${NEW_BASE}/ai/transcript-parse`;
    return url;
  }

  window.fetch = (input, init) => {
    try {
      if (typeof input === "string") return nativeFetch(rewrite(input), init);
      if (input instanceof URL) return nativeFetch(new URL(rewrite(input.href)), init);
      if (input instanceof Request) {
        const next = rewrite(input.url);
        if (next !== input.url) return nativeFetch(new Request(next, input), init);
      }
    } catch (error) {
      console.warn("Credit AI Cloud Run route fallback", error);
    }
    return nativeFetch(input, init);
  };

  console.log("Credit Checker AI route: Cloud Run");
})();
