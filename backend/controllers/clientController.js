export const home = (req, res) => {
  res.render("clients/form", { title: "Clients" });
};

export const games = (req, res) => {
  const name = req.body.name;
  res.render("clients/game", { title: "Quiz", nama: name });
};

export const playerID = (req, res) => {
  const name = req.body.name;
  res.render("clients/game", { title: "Quiz", nama: name });
};