"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleQuestions, topics } from "@/lib/test-bank";
import { isSupabaseConfigured, supabase } from "@/lib/supabase-browser";

export default function TestsPage() {
  const [paidAccess, setPaidAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [topic, setTopic] = useState(topics[0]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const supabaseClient = supabase;

    async function checkAccess() {
      if (!isSupabaseConfigured && localStorage.getItem("opocompi-paid-access") === "true") {
        setPaidAccess(true);
        setCheckingAccess(false);
        return;
      }

      if (!supabaseClient || !isSupabaseConfigured) {
        setCheckingAccess(false);
        return;
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        setCheckingAccess(false);
        return;
      }

      try {
        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const profile = await response.json();
        if (profile.hasAccess) {
          localStorage.setItem("opocompi-paid-access", "true");
          setPaidAccess(true);
        }
      } finally {
        setCheckingAccess(false);
      }
    }

    checkAccess();
  }, []);

  const questions = sampleQuestions[topic];
  const score = useMemo(
    () => questions.filter((question, index) => answers[index] === question.correct).length,
    [answers, questions]
  );

  function resetTest(nextTopic = topic) {
    setTopic(nextTopic);
    setAnswers({});
    setResolved(false);
  }

  if (!paidAccess) {
    return (
      <main className="tests-page">
        <header className="tests-topbar">
          <a className="brand" href="/" aria-label="Volver a OpoCompi">
            <span className="brand-mark logo-mark">
              <img src="/brand/opocompi-logo.png" alt="" />
            </span>
            <span>OpoCompi</span>
          </a>
        </header>
        <section className="tests-locked">
          <p className="eyebrow">Zona de miembros</p>
          <h1>{checkingAccess ? "Comprobando acceso" : "Tests desbloqueados con la suscripción"}</h1>
          <p>
            {checkingAccess
              ? "Estamos revisando tu sesión. Un segundo, compi."
              : "Esta zona es para practicar como en examen: respondes primero y corriges después. Entra o contrata la suscripción para acceder."}
          </p>
          {!checkingAccess ? <a className="btn btn-primary" href="/#login">Entrar o contratar</a> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="tests-page">
      <header className="tests-topbar">
        <a className="brand" href="/" aria-label="Volver a OpoCompi">
          <span className="brand-mark logo-mark">
            <img src="/brand/opocompi-logo.png" alt="" />
          </span>
          <span>OpoCompi</span>
        </a>
        <a className="btn btn-secondary" href="/">Volver al chat</a>
      </header>

      <section className="tests-hero">
        <p className="eyebrow">Practica de miembros</p>
        <h1>Generador de tests</h1>
        <p>Elige bloque, responde sin mirar y pulsa resolver. Los errores se muestran al final para corregir con cabeza fria.</p>
      </section>

      <section className="tests-toolbar">
        <label>
          Bloque
          <select value={topic} onChange={(event) => resetTest(event.target.value)}>
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-dark" type="button" onClick={() => resetTest()}>
          Reiniciar
        </button>
      </section>

      <section className="practice-list">
        {questions.map((item, index) => {
          const selected = answers[index];
          const isCorrect = selected === item.correct;

          return (
            <article className={`practice-question ${resolved ? (isCorrect ? "correct" : "wrong") : ""}`} key={item.question}>
              <div className="question-heading">
                <strong>{index + 1}. {item.question}</strong>
                {resolved ? <span>{isCorrect ? "Correcta" : "Revisar"}</span> : null}
              </div>

              <div className="answer-options">
                {item.options.map((option, optionIndex) => {
                  const letter = String.fromCharCode(65 + optionIndex);
                  const checked = selected === letter;
                  const showCorrect = resolved && item.correct === letter;
                  const showWrong = resolved && checked && item.correct !== letter;

                  return (
                    <label className={`answer-option ${showCorrect ? "right-answer" : ""} ${showWrong ? "wrong-answer" : ""}`} key={option}>
                      <input
                        checked={checked}
                        disabled={resolved}
                        name={`question-${index}`}
                        onChange={() => setAnswers((current) => ({ ...current, [index]: letter }))}
                        type="radio"
                      />
                      <span>{letter}) {option}</span>
                    </label>
                  );
                })}
              </div>

              {resolved ? (
                <div className="answer-feedback">
                  <p><strong>Respuesta correcta:</strong> {item.correct}</p>
                  <p>{item.explanation}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="resolve-bar">
        {resolved ? (
          <p>
            Resultado: <strong>{score}/{questions.length}</strong>. Corrige los fallos, compañero, y seguimos avanzando.
          </p>
        ) : (
          <p>Responde todas las que puedas antes de corregir. Asi entrenas memoria real.</p>
        )}
        <button className="btn btn-primary" type="button" onClick={() => setResolved(true)}>
          Resolver
        </button>
      </section>
    </main>
  );
}
