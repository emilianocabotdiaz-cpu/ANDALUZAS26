export default function AvisoLegalPage() {
  return (
    <main className="legal-page">
      <a className="brand legal-brand" href="/" aria-label="Volver a OpoCompi">
        <span className="brand-mark logo-mark">
          <img src="/brand/opocompi-logo.png" alt="" />
        </span>
        <span>OpoCompi</span>
      </a>

      <article className="legal-document">
        <p className="eyebrow">Informacion legal</p>
        <h1>Aviso legal</h1>
        <p>
          OpoCompi es una plataforma digital de apoyo al estudio para opositores a Policía Nacional.
          La informacion disponible en esta web tiene finalidad formativa y no sustituye el asesoramiento
          profesional, academico o juridico individualizado.
        </p>

        <h2>Titularidad</h2>
        <p>
          Nombre comercial: OpoCompi. Titular: Lorena Garcia Rodriguez, NIF 75569037F.
          Domicilio: C/ Semanario La Higuerita 22 A03, Isla Cristina, Huelva.
          Correo de contacto: contacto@opocompi.com.
        </p>

        <h2>Uso del servicio</h2>
        <p>
          El usuario se compromete a utilizar OpoCompi de forma licita, responsable y acorde con su
          finalidad de preparacion y entrenamiento. No esta permitido usar la plataforma para generar
          contenido ilegal, ofensivo, fraudulento o contrario a derechos de terceros.
        </p>

        <h2>Contenido formativo</h2>
        <p>
          Las respuestas generadas por IA pueden contener errores o quedar desactualizadas. El usuario
          debe contrastar siempre la informacion relevante con el BOE, convocatorias oficiales y fuentes
          juridicas vigentes.
        </p>

        <h2>Contacto</h2>
        <p>
          Para consultas legales o incidencias del servicio, escribe a: contacto@opocompi.com.
        </p>
      </article>
    </main>
  );
}
