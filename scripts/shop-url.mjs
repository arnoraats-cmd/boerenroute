/* Canonieke winkel-URL/slug-logica — één bron van waarheid.
   gen-winkel.mjs schrijft de winkelpagina's met deze slug; alle andere
   generators (gemeente, regio, categorie, categorie×provincie) MOETEN exact
   dezelfde slug gebruiken om naar /winkel/<slug> te linken, anders 404.
   Daarom hier centraal i.p.v. een kopie per generator. */

/** Naam → bestandsveilige slug (lowercase, diakrieten weg, alleen a-z0-9 + '-'). */
export function slugify(s) {
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Slug van een winkel: naam + id (id houdt 'm uniek bij dubbele namen). */
export function shopSlug(shop) {
  return `${slugify(shop.name)}-${shop.id}`;
}

/** Heeft deze winkel een eigen /winkel/-detailpagina? Moet exact overeenkomen
    met de eligibility-filter in gen-winkel.mjs. */
export function hasWinkelPage(shop) {
  return shop.type !== 'onderweg' && Boolean(shop.desc || shop.hours || shop.googleRating);
}
