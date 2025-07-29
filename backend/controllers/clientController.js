const fs = require('fs');
const path = require('path');

const dataFile = path.join(process.cwd(), 'data.json');

const index = (req, res) => {
  res.render("clients/index", { title: "Clients" });
};
const home = (req, res) => {
  res.render("clients/form", { title: "Clients" });
};

const tutor = (req, res) => {
  req.session.playerData = req.body;
  res.render("clients/tutorial", { title: "Clients" });
};

const games = (req, res) => {
  console.log(req.session);
  const { name, avatar, namalengkap, notlp, ig } = req.session.playerData || {};
  if (!name || !namalengkap || !notlp || !ig || !avatar) {
    return res.redirect('/'); // kalau data tidak ada, kembalikan ke form
  }
  res.render("clients/game", {
    title: "Quiz",
    nama: name,
    namalengkap,
    avatar,
    notlp,
    ig,
  });
};

const playerID = (req, res) => {
  console.log(req.session);
  const { name, avatar, namalengkap, notlp, ig } = req.playerData;
  res.render("clients/game", {
    title: "Quiz",
    nama: name,
    namalengkap,
    avatar,
    notlp,
    ig,
  });
};


module.exports = {
  index,
  home,
  tutor,
  games,
  playerID,
};