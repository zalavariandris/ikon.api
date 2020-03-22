var db = require("../database.js")

function search(keyword, limit, offset){
  console.log('search', keyword, limit, offset)
  const stmt = db.prepare(`
  SELECT
    ikonid,
    name,
    COUNT(ikonid) OVER() AS count
  FROM galleries
  WHERE name LIKE ?
  ORDER BY name
  LIMIT ? OFFSET ?
  `)

  const rows = stmt.all("%"+keyword+"%", limit, offset);
  if(!rows.length){
    return {data: [], count: 0};
  }
  const count = rows[0].count;
  rows.forEach((d)=>delete d['count']);
  return {data: rows, count: count};
}

function get(id){
  console.log('get gallery');
  const stmt = db.prepare(`
  SELECT
    ikonid,
    name
  FROM galleries
  WHERE ikonid = ?
  `)

  const row = stmt.get(parseInt(id))
  return row;
}

function exhibitions(id){
  console.log('get exhibitions for gallery', id)
  const stmt = db.prepare(`
  SELECT DISTINCT
    e.ikonid, e.title,
    e.opening, e.isExhibition,
    e.gallery_id,
    g.name
  FROM exhibitions e
  JOIN galleries g ON e.gallery_id==g.ikonid
  WHERE gallery_id = ?
  ORDER BY e.opening DESC;
  `);

  const rows = stmt.all(parseInt(id));
  return rows;
}

module.exports = {search, get, exhibitions};