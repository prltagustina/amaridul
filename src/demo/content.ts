// Provisional copy for the visual phase. Every value here is pending approval and is
// marked in the UI with a DEV tag. Replace these strings once the copy is confirmed.

export const PENDING = "Texto pendiente de aprobación.";

/** Phrase taken from the visual reference; not yet confirmed. */
export const institutionalPhrase = "Construyendo comunidad para el acceso seguro";

/** Closing phrase of the FAQ, also from the visual reference; not yet confirmed. */
export const faqClosingPhrase = "Formamos una comunidad para un acceso seguro, legal y responsable a la planta de cannabis y sus derivados.";

export const faqQuestions = [
  { id: "que-es", title: "¿Qué es Amarí Dul?" },
  { id: "ley-27350", title: "¿Cómo funciona la asociación en el marco de la Ley 27.350?" },
  { id: "productos", title: "¿Qué productos se dispensan?" },
  { id: "calidad", title: "¿Cómo se garantiza la calidad de la medicina?" },
  { id: "quienes", title: "¿Quiénes pueden asociarse?" },
  { id: "ingreso", title: "¿Cómo es el proceso de ingreso?" },
] as const;

export const faqPlaceholderAnswer =
  "Acá va la respuesta aprobada por la asociación. Este texto de ejemplo ocupa su lugar para evaluar la lectura y el ritmo del acordeón.";

export const labNote = "Los análisis son realizados por laboratorio habilitado y forman parte de nuestro sistema de control de calidad.";

export const sumateIntro =
  "Contanos quién sos y qué te acerca a Amarí Dul. Con esta información el equipo te va a orientar sobre el recorrido que corresponde. Enviar la solicitud no implica la admisión como socio.";

export const privacySummary =
  "Usamos estos datos solo para gestionar tu solicitud y contactarte por ella. El aviso de privacidad completo se publica cuando esté aprobado.";

export const interestOptions = [
  { value: "orientacion", label: "Acceder a orientación sobre cannabis medicinal", health: true },
  { value: "procedimiento", label: "Conocer el procedimiento para acceder a cannabis medicinal mediante la asociación", health: true },
  { value: "comunidad", label: "Participar en actividades y proyectos comunitarios", health: false },
  { value: "colaborar", label: "Colaborar profesionalmente con Amarí Dul", health: false },
  { value: "asociarme", label: "Conocer las alternativas para asociarme", health: false },
] as const;

export const reprocannOptions = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "en-tramite", label: "En trámite" },
  { value: "no-sabe", label: "No sé cómo gestionarlo" },
] as const;

export const provinces = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

/** Statutory categories open to enrolment. Honorario is designated by the association, not requested. */
export const categoryOptions = [
  { value: "activo", label: "Activo", description: "Ingreso con derechos y obligaciones asociativas." },
  { value: "adherente", label: "Adherente", description: "Participación comunitaria conforme al estatuto." },
  { value: "paciente", label: "Paciente", description: "Requiere documentación y circuito sanitario adicionales." },
] as const;

export const membershipFee = {
  amount: "$ —",
  frequency: "Periodicidad a confirmar",
  paymentMethod: "Medio de pago a confirmar",
};

export const documents = [
  { id: "estatuto", title: "Estatuto de la asociación", detail: "Versión vigente" },
  { id: "reglamento", title: "Reglamento interno", detail: "Versión vigente" },
] as const;
