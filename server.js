// create xpress app
var express = require("express");
var cors = require('cors')
var app = express();
var db = require("./database.js")
var Exhibition  = require('./models/exhibition.js')
var Artist  = require('./models/artist.js')
var Gallery  = require('./models/gallery.js')
app.use(cors())

// Server Port
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Root endpoint
app.get("/", (req, res, next) => {
    res.json({"message":"Ok"})
});
/* ARTIST */
app.get("/api/artists", (req, res, next) => {
  const data = Artist.search(req.query.name, req.query.limit, req.query.offset);
  res.json(data);
});

app.get("/api/artist/:id", (req, res, next)=>{
  const artist = Artist.get(req.params.id)
  res.json(artist);
});

app.get("/api/artist/:id/exhibitions", (req, res, next)=>{
  const exhibitions = Artist.exhibitions(req.params.id)
  res.json(exhibitions);
});

app.get("/api/artist/:id/graph", (req, res, next)=>{
  res.json(Artist.graph(req.params.id));
});

// EXHIBITION
app.get("/api/exhibitions", (req, res, next) => {
  const data = Exhibition.search(req.query.title, req.query.limit, req.query.offset);
  res.json(data);
});

app.get("/api/exhibition/:id", (req, res, next)=>{
  const exhibition = Exhibition.get(req.params.id)
  res.json(exhibition);
});

app.get("/api/exhibition/:id/artists", (req, res, next)=>{
  const artists = Exhibition.artists(req.params.id);
  res.json(artists);
});

// GALLERY
app.get("/api/galleries", (req, res, next) => {
  const galleries = Gallery.search(req.query.name, req.query.limit, req.query.offset);
  res.json(galleries);
});

app.get('/api/gallery/:id', (req, res, next)=>{
  const gallery = Gallery.get(req.params.id);
  res.json(gallery);
});

app.get('/api/gallery/:id/exhibitions', (req, res, next)=>{
  const exhibitions = Gallery.exhibitions(req.params.id);
  res.json(exhibitions);
})

// Default response for any other request
app.use(function(req, res){
  res.status(404);
});