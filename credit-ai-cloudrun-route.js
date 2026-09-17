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

  async function loadTranscriptReferenceContext() {
    const targetTerm = String(document.getElementById("transcriptTargetTerm")?.value || "").trim();
    const studentMeta = String(document.querySelector("#studentHeader p")?.textContent || "");
    const studentId = String(studentMeta.split("｜")[0] || "").trim();
    if (!targetTerm || !studentId) return { targetTerm, referenceCourses: [] };

    try {
      const [{ getApp }, authModule, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js")
      ]);
      const app = getApp();
      const auth = authModule.getAuth(app);
      const db = firestoreModule.getFirestore(app);
      const user = auth.currentUser;
      if (!user?.email) return { targetTerm, referenceCourses: [] };

      const email = String(user.email).trim().toLowerCase();
      const accessSnap = await firestoreModule.getDoc(firestoreModule.doc(db, "authorizedUsers", email));
      const access = accessSnap.exists() ? accessSnap.data() : {};
      const ownerEmail = String(access?.ownerEmail || email).trim().toLowerCase();
      const studentsSnap = await firestoreModule.getDocs(
        firestoreModule.query(
          firestoreModule.collection(db, "students"),
          firestoreModule.where("ownerEmail", "==", ownerEmail)
        )
      );
      const student = studentsSnap.docs.map(d => ({ docId: d.id, ...d.data() })).find(s => String(s.studentId || s.id || "").trim() === studentId);
      if (!student) return { targetTerm, referenceCourses: [] };

      let sourceCourses = [];
      if (student.curriculumId) {
        const curriculumSnap = await firestoreModule.getDoc(firestoreModule.doc(db, "curricula", student.curriculumId));
        if (curriculumSnap.exists()) sourceCourses = curriculumSnap.data()?.courses || [];
      }
      if (!sourceCourses.length) sourceCourses = Array.isArray(student.courses) ? student.courses : [];

      const referenceCourses = [...new Set(
        sourceCourses
          .filter(course => String(course?.term || "") === targetTerm)
          .map(course => String(course?.name || "").trim())
          .filter(Boolean)
      )];
      return { targetTerm, referenceCourses };
    } catch (error) {
      console.warn("Credit AI reference course load failed; continuing without reference list", error);
      return { targetTerm, referenceCourses: [] };
    }
  }

  async function withTranscriptContext(init = {}) {
    try {
      if (!init?.body || typeof init.body !== "string") return init;
      const body = JSON.parse(init.body);
      if (!Array.isArray(body?.images)) return init;
      const context = await loadTranscriptReferenceContext();
      return {
        ...init,
        body: JSON.stringify({
          ...body,
          targetTerm: context.targetTerm,
          referenceCourses: context.referenceCourses
        })
      };
    } catch (error) {
      console.warn("Credit AI transcript context fallback", error);
      return init;
    }
  }

  window.fetch = async (input, init) => {
    try {
      const rawUrl = typeof input === "string" ? input : (input instanceof URL ? input.href : (input instanceof Request ? input.url : ""));
      const nextUrl = rewrite(rawUrl);
      const isTranscript = rawUrl === `${OLD_BASE}/ai/transcript-parse` || rawUrl === `${NEW_BASE}/ai/transcript-parse`;
      const nextInit = isTranscript ? await withTranscriptContext(init || {}) : init;

      if (typeof input === "string") return nativeFetch(nextUrl, nextInit);
      if (input instanceof URL) return nativeFetch(new URL(nextUrl), nextInit);
      if (input instanceof Request) {
        if (nextUrl !== input.url || nextInit !== init) return nativeFetch(new Request(nextUrl, { method: input.method, headers: input.headers, body: nextInit?.body ?? input.body, mode: input.mode, credentials: input.credentials, cache: input.cache, redirect: input.redirect, referrer: input.referrer, referrerPolicy: input.referrerPolicy, integrity: input.integrity, keepalive: input.keepalive, signal: input.signal }), nextInit?.body ? undefined : nextInit);
      }
    } catch (error) {
      console.warn("Credit AI Cloud Run route fallback", error);
    }
    return nativeFetch(input, init);
  };

  function setupRecognitionUiFixes() {
    const dialog = document.getElementById("classifyDialog");
    const form = document.getElementById("classifyForm");
    const replacement = document.getElementById("replacementCourse");
    if (!dialog || !form || !replacement) return;

    const termOrder = new Map([
      ["一年級上學期", 11], ["一年級下學期", 12],
      ["二年級上學期", 21], ["二年級下學期", 22],
      ["三年級上學期", 31], ["三年級下學期", 32],
      ["四年級上學期", 41], ["四年級下學期", 42],
      ["五年級上學期", 51], ["五年級下學期", 52],
      ["六年級上學期", 61], ["六年級下學期", 62],
      ["七年級上學期", 71], ["七年級下學期", 72],
      ["八年級上學期", 81], ["八年級下學期", 82]
    ]);
    let sorting = false;
    const sortReplacementCourses = () => {
      if (sorting || replacement.options.length <= 2) return;
      sorting = true;
      try {
        const options = [...replacement.options];
        const placeholder = options.find(o => !o.value) || null;
        const courses = options.filter(o => o.value);
        const orderFor = text => {
          const prefix = String(text || "").split("｜")[0].trim();
          return termOrder.get(prefix) ?? 999;
        };
        courses.sort((a, b) => orderFor(a.textContent) - orderFor(b.textContent) || String(a.textContent).localeCompare(String(b.textContent), "zh-Hant", { numeric: true }));
        const current = replacement.value;
        replacement.replaceChildren(...(placeholder ? [placeholder] : []), ...courses);
        if ([...replacement.options].some(o => o.value === current)) replacement.value = current;
      } finally {
        sorting = false;
      }
    };

    new MutationObserver(sortReplacementCourses).observe(replacement, { childList: true });
    dialog.addEventListener("toggle", sortReplacementCourses);
    document.addEventListener("click", event => {
      if (event.target.closest?.(".classify")) setTimeout(sortReplacementCourses, 0);
    }, true);

    const closeButton = dialog.querySelector('.dialog-heading button[aria-label="關閉"]');
    if (closeButton) {
      closeButton.setAttribute("formnovalidate", "");
      closeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        dialog.close("cancel");
      }, true);
    }

    let savedRecognition = false;
    form.addEventListener("submit", event => {
      if (event.submitter?.id === "saveClassification") savedRecognition = true;
    }, true);
    dialog.addEventListener("close", () => {
      if (!savedRecognition) return;
      savedRecognition = false;
      setTimeout(() => {
        const timeline = document.querySelector('#detailTabs [data-tab="timeline"]');
        if (timeline) timeline.click();
      }, 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupRecognitionUiFixes, { once: true });
  else setupRecognitionUiFixes();

  console.log("Credit Checker AI route: Cloud Run + transcript curriculum reference + recognition UI fixes v1.2.0");
})();
