/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var parser = require("body-parser");
var client_id = '9006d77316ea4fff8472a63df4466f51'; // Your client id
var client_secret = '4dd0ba1d10cc4e1fa54c6d3248dc272f'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();
app.use(parser.json());
app.use(express.static(__dirname + '/public'))
   .use(cookieParser());


app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/get_phone_number', function(req, res) {
	
	var id = req.query.spotify_id; 
	var redis = require("redis");

	var client = redis.createClient();

	client.on("connect", function() {
		console.log("connected");
	});

	client.get(id, function(err, reply) {
		console.log(err, reply);
		
		if(reply == null) {
			res.status(404);
			res.send("User not found.");
		}
		else {
			console.log("Getting to success path");
			res.send(reply);
		}


	});

});
app.post('/add_phone_number', function(req, res) {
	var phone_number = req.body.number;
	var spotify_id = req.body.id;
	var redis = require("redis");
	var client = redis.createClient();

	client.set(spotify_id, phone_number);

	res.send("Success");
});
/*
app.use(bodyParser.urlencoded({
  extended: true,
}));
*/

/*app.use(bodyParser.json());*/

app.get('/search_artists', function(req, res) {
  console.log(req.query.search)
  console.log(req.body);
  var SpotifyWebApi = require('spotify-web-api-node');
  var spotifyApi = new SpotifyWebApi({
   clientId : '9006d77316ea4fff8472a63df4466f51',
   clientSecret : '4dd0ba1d10cc4e1fa54c6d3248dc272f',
   redirectUri : 'http://localhost:8888/callback',
});

// app.post('/search_artists', function(req, res) {
// 	var search_field = req.body.txtSearch;
// 	console.log(req.body);
// 	console.log(search_field);
// var SpotifyWebApi = require('spotify-web-api-node');
// var spotifyApi = new SpotifyWebApi({
// 	clientId : '9006d77316ea4fff8472a63df4466f51',
// 	clientSecret : '4dd0ba1d10cc4e1fa54c6d3248dc272f',
// 	redirectUri : 'http://localhost:8888/callback',
// });

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.searchArtists(req.query.search)
    .then(function(data) {
         console.log('Search artists', data.body);
     }, function(err) {
        console.error(err);
  
  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err.message);
  });


});



});

var search_field = null;


console.log('Listening on 8888');
app.listen(8888);
