var db = require("../database.js")
var graphology = require('graphology')
var subGraph = require('graphology-utils/subgraph');

function search(keyword, limit, offset){
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

const TEST_GRAPH = {
  nodes: [
    {key: 1, attributes: {label: "Andris"}},
    {key: 2, attributes: {label: "Mása"}},
    {key: 3, attributes: {label: "Judit"}},
  ],
  edges:[
    {source: 1, target: 2},
    {source: 2, target: 3},
    {source: 3, target: 1},
  ]
};

function graph(id){
  // Get all paths to co-exhibiting artists
  const stmt = db.prepare(`
  SELECT DISTINCT A.artist_id AS a, A.exhibition_id AS b, B.artist_id AS c, C.exhibition_id AS d
  FROM relations A
  JOIN relations B ON B.exhibition_id==A.exhibition_id
  JOIN relations C ON C.artist_id==B.artist_id
  WHERE A.artist_id==?
  AND a!=c
  `)

  const paths = stmt.all(parseInt(id)).map( (d)=> [d.a, d.b, d.c, d.d] );
  if(paths.length==0)
    return TEST_GRAPH;

  // Create graph from paths
  // collect nodes
  let G = new graphology.Graph()

  for(let path of paths){
    if(!G.hasNode('a'+path[0]))
      G.addNode('a'+path[0], {color:'red'})
    if(!G.hasNode('e'+path[1]))
      G.addNode('e'+path[1], {color:'yellow'})
    if(!G.hasNode('a'+path[2]))
      G.addNode('a'+path[2], {color:'lightblue'})
    
    if(!G.hasEdge('a'+path[0], 'e'+path[1]))
      G.addEdge('a'+path[0], 'e'+path[1])
    if(!G.hasEdge('e'+path[1], 'a'+path[2]))
      G.addEdge('e'+path[1], 'a'+path[2])
  }

  // collect edges
  for(let path of paths){
    if(G.hasNode(path[3])){
      if(!G.hasEdge('a'+path[2], 'e'+path[3])){
        G.addEdge('a'+path[2], 'e'+path[3])
      }
    }
  }

  // calculate degree centrality
  for(let n of G.nodes()){
    G.setNodeAttribute(n, 'degree',  G.degree(n));
  }

  let sumDegree = 0;
  for(let n of G.nodes()){
    sumDegree+=G.getNodeAttribute(n, 'degree');
  }

  for(let n of G.nodes()){
    let degree = G.degree(n)//G.getNodeAttribute(n, 'degree');
    G.setNodeAttribute(n, 'degreeCentrality', degree/sumDegree);
  }

  // set node visual attributes
  for(let n of G.nodes()){
    let degreeCentrality = G.getNodeAttribute(n, 'degree');
    let defaultSize = 40;
    G.setNodeAttribute(n, 'size', n[0]=='a' ? Math.log1p(degreeCentrality**3)*20 : defaultSize);
  }

  // remove leaf nodes
  G = subGraph(G, G.nodes().filter( (n)=> G.degree(n)>1) );

  // populate artists names
  const artist_ids = G.nodes()
  .filter( (n)=>n[0]=='a' )
  .map((n)=>parseInt(n.slice(1)));

  // get artist in graph by ids
  db.prepare(`
  SELECT 
    id,
    name
  FROM artists
  WHERE id IN (${Array(artist_ids.length).fill('?').join(',')})
  `)
  .all(artist_ids)
  .forEach( (row)=>{
    G.setNodeAttribute('a'+row.id, 'label', row.name);
  });


  // populate exhibition titles
  const exhibition_ids = G.nodes()
  .filter( (n)=>n[0]=='e' )
  .map((n)=>parseInt(n.slice(1)));

  db.prepare(`
    SELECT
      ikonid,
      title,
      isExhibition 
    FROM exhibitions 
    WHERE ikonid IN (${Array(exhibition_ids.length).fill('?').join(',')})`)
  .all(exhibition_ids)
  .forEach( (row)=>{
    G.setNodeAttribute('e'+row.ikonid, 'label', row.title);
    G.setNodeAttribute('e'+row.ikonid, 'isExhibition', row.isExhibition);
  });

  // drop leaf nodes
  G = subGraph(G, G.nodes().filter( (n)=> G.degree(n)>1) );
  return G;
}



module.exports = {search, get, exhibitions, graph};