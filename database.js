const DBSOURCE = "ikon_v007.db"
var Database  = require('better-sqlite3');
const db = new Database(DBSOURCE);


module.exports = db;

