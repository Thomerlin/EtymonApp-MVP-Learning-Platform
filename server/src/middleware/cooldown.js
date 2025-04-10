const cooldowns = {};

const applyCooldown = (exerciseId, res) => {
  cooldowns[exerciseId] = Date.now() + 30000;
  res.status(400).json({ error: "Incorrect answer. Try again in 30 seconds." });
};

const checkCooldown = (req, res, next) => {
  const { exerciseId } = req.body;
  const now = Date.now();
  if (cooldowns[exerciseId] && cooldowns[exerciseId] > now) {
    const remainingTime = Math.ceil((cooldowns[exerciseId] - now) / 1000);
    return res.status(429).json({ error: `Incorrect exercise. Try again in ${remainingTime} seconds.` });
  }
  next();
};

module.exports = { applyCooldown, checkCooldown };