module.exports = {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};