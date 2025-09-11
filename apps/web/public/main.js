(() => {
  const $ = (s) => document.querySelector(s);
  const webBase = location.origin; // http://localhost:3300

  let sessionId = null;
  let currentNodeKey = null;
  let currentType = null;
  let currentValidations = {};

  const log = (msg) => {
    const el = $("#log");
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.textContent = line + "\n" + el.textContent;
  };

  const setQuestion = ({ nodeKey, questionText, type, validations }) => {
    currentNodeKey = nodeKey || null;
    currentType = type || null;
    currentValidations = validations || {};
    if (questionText) {
      $("#questionText").textContent = questionText;
      $("#questionBox").style.display = "block";
      $("#typeBadge").textContent = type ? `type: ${type}` : "";
      const hint = [];
      if (type === "number") {
        if (typeof validations?.min === "number") hint.push(`min: ${validations.min}`);
        if (typeof validations?.max === "number") hint.push(`max: ${validations.max}`);
      $("#answerInput").setAttribute("inputmode", "numeric");
      $("#answerInput").setAttribute("placeholder", "Entrez un nombre...");
    } else {
      $("#answerInput").removeAttribute("inputmode");
      $("#answerInput").setAttribute("placeholder", "Votre réponse...");
      }
      if (type === "open") hint.push("texte requis");
      $("#validationHint").textContent = hint.join(" · ");
    }
  };

  const startSession = async () => {
    const departmentKey = $("#department").value || "hr";
    const res = await fetch(`${webBase}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentKey })
    });
    if (!res.ok) throw new Error(`start failed: ${res.status}`);
    const data = await res.json();
    sessionId = data.sessionId;
    $("#sessionInfo").textContent = `Session: ${sessionId}`;
    log(`Session démarrée (${departmentKey})`);

    // Récupérer la première question (nodeKey undefined)
    const q = await answerAndNext(undefined);
    if (q?.done) {
      $("#questionText").textContent = "Flow terminé.";
    }
  };

  const answerAndNext = async (value) => {
    if (!sessionId) throw new Error("Pas de session active");
    const payload = value === undefined
      ? { }
      : { answer: value, nodeKey: currentNodeKey };
    const res = await fetch(`${webBase}/api/session/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      log(`Erreur ${res.status}: ${JSON.stringify(err)}`);
      throw new Error(`answer failed ${res.status}`);
    }
    const data = await res.json();
    const nq = data?.nextQuestion || {};
    setQuestion(nq);
    return { ...data, nextQuestion: nq };
  };

  const onSend = async () => {
    const input = $("#answerInput");
    if (!currentNodeKey) {
      log("Aucune question active. Démarrez une session ou patientez.");
      return;
    }
    let value = input.value;
    if (currentType === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) {
        log("La réponse doit être un nombre.");
        return;
      }
      value = num;
    } else if (currentType === "open") {
      if (!value || !value.trim()) {
        log("Veuillez saisir une réponse texte.");
        return;
      }
    }
    try {
      const resp = await answerAndNext(value);
      if (resp.done) {
        $("#questionText").textContent = "Flow terminé.";
        $("#typeBadge").textContent = "";
        $("#validationHint").textContent = "";
      }
      input.value = "";
    } catch (e) {
      // Already logged
    }
  };

  const refreshSessionAnswers = async () => {
    if (!sessionId) return;
    const res = await fetch(`${webBase}/api/session/${sessionId}/answers`);
    const data = await res.json();
    $("#answersLog").textContent = JSON.stringify(data, null, 2);
  };

  const refreshDeptAnswers = async () => {
    const key = $("#department").value || "hr";
    const res = await fetch(`${webBase}/api/department/${encodeURIComponent(key)}/answers`);
    const data = await res.json();
    $("#deptLog").textContent = JSON.stringify(data, null, 2);
  };

  $("#startBtn").addEventListener("click", startSession);
  $("#sendBtn").addEventListener("click", onSend);
  $("#refreshAnswers").addEventListener("click", refreshSessionAnswers);
  $("#refreshDeptAnswers").addEventListener("click", refreshDeptAnswers);
})();
