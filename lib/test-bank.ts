export type TestQuestion = {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
};

export const topics = ["Constitución Española", "Derecho Penal", "Extranjería", "Ortografía", "Psicotécnicos"];

export const sampleQuestions: Record<string, TestQuestion[]> = {
  "Constitución Española": [
    {
      question: "¿Qué valores superiores proclama el artículo 1.1 de la Constitución Española?",
      options: [
        "Unidad, autonomia, solidaridad y justicia.",
        "Libertad, justicia, igualdad y pluralismo politico.",
        "Legalidad, jerarquia normativa, publicidad y seguridad juridica.",
        "Igualdad, merito, capacidad y publicidad.",
      ],
      correct: "B",
      explanation: "El articulo 1.1 recoge libertad, justicia, igualdad y pluralismo politico. La opcion C mezcla principios del articulo 9.3.",
    },
    {
      question: "¿Dónde reside la soberanía nacional según la Constitución?",
      options: ["En las Cortes Generales.", "En el Rey.", "En el pueblo espanol.", "En el Gobierno."],
      correct: "C",
      explanation: "El articulo 1.2 establece que la soberania nacional reside en el pueblo espanol.",
    },
    {
      question: "Cual es la forma politica del Estado espanol?",
      options: ["República parlamentaria.", "Monarquía constitucional federal.", "Monarquía parlamentaria.", "Estado autonómico presidencialista."],
      correct: "C",
      explanation: "El articulo 1.3 establece que la forma politica del Estado espanol es la Monarquia parlamentaria.",
    },
  ],
  "Derecho Penal": [
    {
      question: "En terminos generales, que caracteriza al dolo eventual?",
      options: [
        "El autor quiere directamente el resultado como fin principal.",
        "El autor preve el resultado como posible y aun asi continua aceptando el riesgo.",
        "El autor actua sin ninguna representacion del resultado.",
        "El autor actua siempre por error invencible.",
      ],
      correct: "B",
      explanation: "En el dolo eventual el sujeto no busca necesariamente el resultado, pero lo asume como posible y continua actuando.",
    },
    {
      question: "Cuando puede hablarse de tentativa de forma general?",
      options: [
        "Cuando solo existe una idea interna no exteriorizada.",
        "Cuando se inicia la ejecucion del delito pero no se consuma por causas ajenas a la voluntad del autor.",
        "Cuando el delito se consuma completamente.",
        "Cuando la conducta es siempre imprudente.",
      ],
      correct: "B",
      explanation: "La tentativa exige inicio de ejecucion y falta de consumacion por causas independientes de la voluntad del autor.",
    },
    {
      question: "Que diferencia basica hay entre dolo e imprudencia?",
      options: [
        "En el dolo hay voluntad o aceptacion del resultado; en la imprudencia falta el cuidado debido.",
        "La imprudencia siempre implica intencion directa.",
        "El dolo solo existe en infracciones administrativas.",
        "No existe diferencia juridica relevante.",
      ],
      correct: "A",
      explanation: "El dolo se relaciona con querer o aceptar el resultado; la imprudencia con infringir el deber de cuidado.",
    },
  ],
  Extranjeria: [
    {
      question: "Cual es la diferencia general entre estancia y residencia?",
      options: [
        "La estancia es permanencia temporal; la residencia implica autorizacion para vivir en Espana durante un periodo mas estable.",
        "La residencia solo puede durar 24 horas.",
        "La estancia equivale siempre a nacionalidad española.",
        "No existe diferencia entre ambas figuras.",
      ],
      correct: "A",
      explanation: "De forma general, la estancia es permanencia temporal y la residencia supone una autorizacion de permanencia mas estable.",
    },
    {
      question: "Que debe hacer OpoCompi si una pregunta depende de normativa de extranjeria vigente?",
      options: [
        "Inventar el articulo mas probable.",
        "Responder con cautela y recomendar verificar fuente oficial actualizada.",
        "Citar academias como fuente definitiva.",
        "Evitar siempre responder cualquier concepto.",
      ],
      correct: "B",
      explanation: "Extranjeria cambia y exige prudencia: BOE y fuentes oficiales recientes tienen prioridad.",
    },
    {
      question: "¿Qué enfoque es más seguro al estudiar extranjería para oposición?",
      options: [
        "Memorizar esquemas antiguos sin comprobar fecha.",
        "Priorizar conceptos base y contrastar articulos o procedimientos con normativa vigente.",
        "Estudiar solo casos practicos sin teoria.",
        "No hacer tests porque la materia cambia.",
      ],
      correct: "B",
      explanation: "La base conceptual ayuda, pero los detalles normativos deben contrastarse con fuente oficial actualizada.",
    },
  ],
  Ortografia: [
    {
      question: "Elige la forma correcta.",
      options: ["Preveer.", "Prever.", "Prevéer.", "Preveher."],
      correct: "B",
      explanation: "La forma correcta es prever. 'Preveer' es una forma incorrecta muy habitual.",
    },
    {
      question: "Cuando llevan tilde los monosilabos?",
      options: [
        "Siempre.",
        "Nunca, salvo casos de tilde diacritica.",
        "Solo si terminan en vocal.",
        "Solo si son verbos.",
      ],
      correct: "B",
      explanation: "Los monosilabos no se tildan por regla general, salvo casos de tilde diacritica como tu/tu, el/el, si/si.",
    },
    {
      question: "Identifica la palabra mal escrita.",
      options: ["Exorbitante.", "Exuberante.", "Exhuberante.", "Exhaustivo."],
      correct: "C",
      explanation: "La forma correcta es exuberante, sin h intercalada.",
    },
  ],
  Psicotecnicos: [
    {
      question: "Completa la serie: 3, 6, 12, 24, ...",
      options: ["30.", "36.", "42.", "48."],
      correct: "D",
      explanation: "Cada termino se multiplica por 2: 3, 6, 12, 24, 48.",
    },
    {
      question: "Si todos los A son B y algunos B son C, que conclusion es segura?",
      options: [
        "Todos los A son C.",
        "Algunos C son A necesariamente.",
        "Todos los A son B.",
        "Ningun B es C.",
      ],
      correct: "C",
      explanation: "La unica conclusion segura es la premisa dada: todos los A son B. No se puede asegurar relacion entre A y C.",
    },
    {
      question: "Serie alfabetica: A, C, F, J, O, ...",
      options: ["S.", "T.", "U.", "V."],
      correct: "C",
      explanation: "Los saltos son +2, +3, +4, +5; el siguiente salto es +6. O + 6 = U.",
    },
  ],
};
