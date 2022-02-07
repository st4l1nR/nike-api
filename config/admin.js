module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'e9f3bfc5fd878ea9549c38c6df73140f'),
  },
});
