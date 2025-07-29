const fs = require('fs');
const path = require('path');

const dataFile = path.join(process.cwd(), 'data.json');

export const index = (req, res) => {
  res.render("clients/index", { title: "Clients" });
};
export const home = (req, res) => {
  res.render("clients/form", { title: "Clients" });
};

export const tutor = (req, res) => {
  req.session.playerData = req.body;
  res.render("clients/tutorial", { title: "Clients" });
};

export const games = (req, res) => {
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

export const playerID = (req, res) => {
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