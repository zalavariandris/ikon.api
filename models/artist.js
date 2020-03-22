var db = require("../database.js")
function search(keyword, limit, offset){
  console.log('search', keyword, limit, offset)
  const stmt = db.prepare(`
  SELECT 
    a.id, 
    a.name, 
    COUNT(DISTINCT ae.exhibition_id) as no_exhibitions,
    COUNT(a.id) OVER() AS count
  FROM artists a
  INNER JOIN relations ae ON ae.artist_id = a.id
  WHERE a.name LIKE ?
  AND ae.relation='exhibiting'
  GROUP BY a.id 
  ORDER BY no_exhibitions DESC
  LIMIT ? OFFSET ?
  `);
  const rows = stmt.all("%"+keyword+"%", limit, offset);
  if(!rows.length){
    return {data: [], count: 0};
  }
  const count = rows[0].count;
  rows.forEach((d)=>delete d['count']);
  return {data: rows, count: count};
};

function get(id){
  console.log('get artist');
  const stmt = db.prepare(`
  SELECT
    id,
    name
  FROM artists
  WHERE id == ?`);

  const row = stmt.get(parseInt(id));
  return row;
}

function exhibitions(id){
  console.log('get exhibitions for artist', id);
  const stmt = db.prepare(`
  SELECT DISTINCT e.ikonid, e.title, e.opening, e.isExhibition, ae.relation, em.artistsCount, e.gallery_id, g.name, gm.exhibition_count
  FROM exhibitions e
  JOIN relations ae ON e.ikonid = ae.exhibition_id
  JOIN galleries g ON g.ikonid==e.gallery_id
  JOIN (
    SELECT e.ikonid, COUNT(ae.exhibition_id) AS artistsCount
    FROM exhibitions e
    LEFT OUTER JOIN relations ae ON e.ikonid = ae.exhibition_id
    WHERE ae.relation == 'exhibiting'
    GROUP BY e.ikonid
  ) em ON em.ikonid == e.ikonid
  JOIN (
      SELECT g.ikonid, g.name, COUNT(e.ikonid) as exhibition_count
      FROM galleries g
      LEFT JOIN exhibitions e ON e.gallery_id==g.ikonid
      GROUP BY g.ikonid
  ) gm ON gm.ikonid==e.gallery_id
  WHERE ae.artist_id = ?
  ORDER BY e.opening DESC;
  `)

  const rows = stmt.all(parseInt(id));
  return rows;
}

module.exports = {search, get, exhibitions};