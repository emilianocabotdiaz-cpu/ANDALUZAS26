export default function PrivacidadPage() {
  return (
    <main className="legal-page">
      <a className="brand legal-brand" href="/" aria-label="Volver a OpoCompi">
        <span className="brand-mark logo-mark">
          <img src="/brand/opocompi-logo.png" alt="" />
        </span>
        <span>OpoCompi</span>
      </a>

      <article className="legal-document">
        <p className="eyebrow">Datos personales</p>
        <h1>Politica de privacidad</h1>
        <p>
          Esta politica explica de forma sencilla que datos tratamos en OpoCompi y para que los usamos.
          Debe revisarse por un profesional antes de iniciar una explotacion comercial definitiva.
        </p>

        <h2>Responsable del tratamiento</h2>
        <p>
          Nombre comercial: OpoCompi. Responsable: Lorena Garcia Rodriguez, NIF 75569037F.
          Domicilio: C/ Semanario La Higuerita 22 A03, Isla Cristina, Huelva.
          Correo de contacto: contacto@opocompi.com.
        </p>

        <h2>Datos que podemos tratar</h2>
        <ul>
          <li>Email y datos de acceso del usuario.</li>
          <li>Estado de suscripción y datos asociados al pago gestionado por Stripe.</li>
          <li>Mensajes enviados al chat para poder generar respuestas de estudio.</li>
          <li>Datos tecnicos basicos necesarios para seguridad, funcionamiento y mejora del servicio.</li>
        </ul>

        <h2>Finalidad</h2>
        <p>
          Usamos los datos para crear y mantener cuentas, comprobar suscripciones, prestar el chat de IA,
          procesar pagos, mejorar la experiencia y atender incidencias.
        </p>

        <h2>Servicios externos</h2>
        <p>
          OpoCompi puede apoyarse en Supabase para autenticacion y base de datos, Stripe para pagos,
          Vercel para alojamiento y OpenAI para generacion de respuestas. Cada proveedor trata datos
          conforme a sus propias condiciones y medidas de seguridad.
        </p>

        <h2>Derechos del usuario</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad de tus
          datos escribiendo a contacto@opocompi.com.
        </p>

        <h2>Conservacion</h2>
        <p>
          Conservaremos los datos mientras exista la cuenta, la suscripción o una obligación legal aplicable.
          Tambien podremos conservar informacion imprescindible para resolver incidencias o cumplir
          responsabilidades legales.
        </p>
      </article>
    </main>
  );
}
