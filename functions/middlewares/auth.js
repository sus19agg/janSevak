const jwt = require('jsonwebtoken');
const config = "fdg8734bsuirrty";


const isAuthenticated = (req, res, next) => {
  const token = req.headers.authorization;

  if (token) {
    jwt.verify(token, config, (err, data) => {
      if (err) {

        res.status(401).json({
          success: false, err: 'unauthenticated request'
        });
      }
      else {
        // if (data.error !== undefined) {
        //
        //     return res.status(401).json({
        //         success: false, err: 'unauthenticated request'
        //     });
        // }
        //else {
        let email = data.email;
        email = email.replace(/\./g, ',');
        const name = data.name;

        req.body.email = email;
        req.body.name = name;

        return next();
        //}
      }
    });
  }
  else {
    res.status(401).json({
      success: false, err: 'unauthenticated request'
    });
  }
};

module.exports =  isAuthenticated;
