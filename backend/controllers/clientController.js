const fs = require('fs');
const path = require('path');
const { Player } = require('../models');

const dataFile = path.join(process.cwd(), 'data.json');

const index = (req, res) => {
  res.render("clients/index", { title: "Clients" });
};
const home = (req, res) => {
  res.render("clients/form", { title: "Clients" });
};

const tutor = async (req, res) => {
  const { name, avatar, namalengkap, notlp, ig } = req.body;
  try {
    const newPlayer = await Player.create({
      name,
      avatar,
      namalengkap,
      notlp,
      ig
    });

    req.session.playerId = newPlayer.id;
    req.session.playerData = {
      name,
      avatar,
      namalengkap,
      notlp,
      ig
    };

    res.render("clients/tutorial", { title: "Clients" });
  } catch (err) {
    console.error("Gagal simpan player:", err);
    res.status(500).send("Gagal menyimpan player");
  }
};

const games = async (req, res) => {
  try {
    const player = await Player.findByPk(req.session.playerId);
    if (!player) return res.redirect('/');

    res.render("clients/game", {
      title: "Quiz",
      nama: player.name,
      namalengkap: player.namalengkap,
      avatar: player.avatar,
      notlp: player.notlp,
      ig: player.ig
    });
  } catch (err) {
    console.error("Gagal ambil player:", err);
    res.redirect('/');
  }
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