export default {
  async fetch(request, env) {
    // 将请求转发到dist内的静态资源
    return env.ASSETS.fetch(request);
  }
};