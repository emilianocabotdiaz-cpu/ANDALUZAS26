import { getLatestMediaNews } from "@/lib/official-news";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const revalidate = 3600;

export default async function ActualidadPage() {
  const mediaItems = await getLatestMediaNews();
  const [featuredItem, ...secondaryItems] = mediaItems;

  return (
    <main className="news-page">
      <header className="tests-topbar">
        <a className="brand" href="/" aria-label="Volver a OpoCompi">
          <span className="brand-mark logo-mark">
            <img src="/brand/opocompi-logo.png" alt="" />
          </span>
          <span>OpoCompi</span>
        </a>
        <a className="btn btn-secondary" href="/">Volver</a>
      </header>

      <section className="news-hero">
        <p className="eyebrow">Actualidad para opositores</p>
        <h1>Noticias sobre oposiciones a Policía Nacional</h1>
        <p>
          Una seleccion automatica de noticias publicadas en medios de comunicacion. Sirven para entender contexto, cambios y novedades de forma mas didactica.
        </p>
      </section>

      {featuredItem ? (
        <section className="editorial-news-grid" aria-label="Noticias de medios">
          <article className="news-card media-news-card featured-news-card">
            {featuredItem.imageUrl ? <img src={featuredItem.imageUrl} alt="" /> : null}
            <div className="news-meta">
              <span>{featuredItem.publisher ?? featuredItem.source}</span>
              <span>{featuredItem.category}</span>
            </div>
            <h2>{featuredItem.title}</h2>
            <p>{featuredItem.summary}</p>
            <div className="news-footer">
              <time dateTime={featuredItem.publishedAt}>{formatDate(featuredItem.publishedAt)}</time>
              <a href={featuredItem.url} target="_blank" rel="noreferrer">
                Leer en el medio
              </a>
            </div>
          </article>

          <div className="secondary-news-list">
            {secondaryItems.slice(0, 4).map((item) => (
              <article className="news-card media-news-card compact-news-card" key={item.id}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
                <div className="news-meta">
                  <span>{item.publisher ?? item.source}</span>
                </div>
                <h2>{item.title}</h2>
                <div className="news-footer">
                  <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    Leer
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="news-grid media-news-grid" aria-label="Noticias de medios">
          <article className="news-card news-empty">
            <div className="news-meta">
              <span>Sin noticias de medios</span>
              <span>Google News</span>
            </div>
            <h2>No hay noticias recientes detectadas en medios.</h2>
            <p>OpoCompi seguira revisando automaticamente y mostrara las noticias cuando aparezcan.</p>
          </article>
        </section>
      )}

      {secondaryItems.length > 4 ? (
        <section className="news-section-heading">
          <p className="eyebrow">Mas noticias</p>
          <h2>Ultimas publicaciones</h2>
        </section>
      ) : null}

      {secondaryItems.length > 4 ? (
        <section className="news-grid media-news-grid" aria-label="Mas noticias de medios">
          {secondaryItems.slice(4).map((item) => (
          <article className="news-card media-news-card" key={item.id}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
            <div className="news-meta">
              <span>{item.publisher ?? item.source}</span>
              <span>{item.category}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <div className="news-footer">
              <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
              <a href={item.url} target="_blank" rel="noreferrer">
                Leer en el medio
              </a>
            </div>
          </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
