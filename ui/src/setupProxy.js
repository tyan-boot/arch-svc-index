const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://127.0.0.1:8788",
      changeOrigin: true,
    })
  );

  app.use(
    "/file",
    createProxyMiddleware({
      target: "http://127.0.0.1:8788",
      changeOrigin: true,
    })
  );
};