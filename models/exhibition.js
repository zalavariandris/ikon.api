var db = require("../database.js")
function search(keyword, limit, offset){
  console.log('search', keyword, limit, offset)
  const stmt = db.prepare(`
  SELECT 
    e.ikonid, 
    e.title, 
    e.opening, 
    e.closing, 
    e.isExhibition, 
    e.gallery_id, 
    g.name as gallery_name, 
    COUNT(e.ikonid) OVER() AS count
  FROM exhibitions e
  JOIN galleries g ON g.ikonid=e.gallery_id
  WHERE title LIKE ?
  ORDER BY e.opening DESC
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
  console.log('get exhibition')
  const stmt = db.prepare(`
  SELECT
    e.ikonid,
    e.title,
    e.opening,
    e.closing,
    e.gallery_id,
    g.name as gallery_name
  FROM exhibitions e
  JOIN galleries g ON g.ikonid=e.gallery_id
  WHERE e.ikonid = ?
  `)

  const row = stmt.get(parseInt(id))
  return row;
}

function artists(id){
  console.log('get artists for exhibition');
  const stmt = db.prepare(`
  SELECT
    a.id,
    a.name,
    ae.relation
  FROM artists a
  JOIN relations ae ON ae.artist_id == a.id
  WHERE ae.exhibition_id = ?
  `)

  const rows = stmt.all(parseInt(id))
  return rows;
}

module.exports = {search, get, artists};