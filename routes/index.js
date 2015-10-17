var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');

/* GET home page. */

router.get('/', function(req, res) {
  url = 'http://www.viki.com';

    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            console.log($('.c-item a').attr('href'));
			res.send(html);
        }
    })
});

module.exports = router;
