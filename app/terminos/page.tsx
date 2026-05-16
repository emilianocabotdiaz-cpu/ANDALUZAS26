export default function TerminosPage() {
  return (
    <main className="legal-page">
      <a className="brand legal-brand" href="/" aria-label="Volver a OpoCompi">
        <span className="brand-mark logo-mark">
          <img src="/brand/opocompi-logo.png" alt="" />
        </span>
        <span>OpoCompi</span>
      </a>

      <article className="legal-document">
        <p className="eyebrow">Condiciones del servicio</p>
        <h1>Terminos de uso</h1>
        <p>
          Al utilizar OpoCompi aceptas estas condiciones. El servicio esta pensado como herramienta de
          apoyo al estudio para opositores y no garantiza resultados, aprobados ni plazas.
        </p>

        <h2>Titular del servicio</h2>
        <p>
          OpoCompi es el nombre comercial del servicio titularidad de Lorena Garcia Rodriguez,
          NIF 75569037F, con domicilio en C/ Semanario La Higuerita 22 A03, Isla Cristina,
          Huelva. Correo de contacto: contacto@opocompi.com.
        </p>

        <h2>Suscripción</h2>
        <p>
          La suscripción da acceso al chat privado y a las funciones de práctica disponibles en cada momento.
          Los pagos y renovaciones se gestionan mediante Stripe. El usuario podrá gestionar su suscripción
          desde el portal de cliente habilitado en la aplicacion.
        </p>

        <h2>Prueba gratuita</h2>
        <p>
          OpoCompi puede ofrecer un numero limitado de mensajes gratuitos para probar el servicio. Esta
          prueba puede modificarse, limitarse o retirarse para evitar abusos o mejorar el producto.
        </p>

        <h2>Uso responsable de la IA</h2>
        <p>
          Las respuestas del asistente deben tomarse como apoyo formativo. El usuario debe verificar los
          contenidos importantes con fuentes oficiales, especialmente BOE, convocatorias y normativa vigente.
        </p>

        <h2>Cancelacion</h2>
        <p>
          El usuario podrá cancelar la suscripción desde el portal de Stripe si está disponible en su cuenta.
          La cancelacion normalmente evita futuras renovaciones, manteniendo el acceso hasta el final del
          periodo ya abonado.
        </p>

        <h2>Limitaciones</h2>
        <p>
          OpoCompi puede suspender o limitar cuentas ante uso abusivo, intentos de fraude, impagos,
          vulneraciones de seguridad o incumplimiento de estas condiciones.
        </p>
      </article>
    </main>
  );
}
