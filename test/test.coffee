req = require "request"


req.defaults {timeout:1000}

req.post "http://www.google.com", (error, res, body) ->
									console.log(error);