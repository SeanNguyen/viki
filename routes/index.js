var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var phantom = require('phantom');


/* GET home page. */

router.get('/', function(req, res) {
	url = 'http://www.viki.com';

	//phantomjs
	phantom.create(function (ph) {
		ph.createPage(function (page) {
			page.onLoadFinished = function() {
				console.log('Page loaded finished');
				res.send(page.content);
		    	ph.exit();
		    };

			page.open(url, function (status) {
				console.log('Status: ' + status);
				if(status === 'success') {
					page.evaluate(function(){});
				} else {
					request(url, function(error, response, html){
						if(!error){
							var repeatCount = countDuplicatedItems(html);
							res.send(repeatCount);
						}
					});
					ph.exit();
				}
		    });
		});
	}, 
	{
		dnodeOpts: {
			weak: false
		}
	});

});

function countDuplicatedItems(htmlContent) {
	var $ = cheerio.load(htmlContent);

	//get all items that need to analyze
	var items = [];

	$('.item').each(function() {
		var url = extractUrlFromItem(this, $);
		items.push(url);
	});
	$('.menu-dropdown').each(function() {
		var url = extractUrlFromItem(this, $);
		items.push(url);
	});
	$('.c-item').each(function() {
		var url = extractUrlFromItem(this, $);
		items.push(url);
	});

	var repeatCount = { videos: {}, channels: {}, celebrities: {} };

	for (var i = items.length - 1; i >= 0; i--) {
		var url = items[i];
		if(!url) {
			continue;
		}
		if(url.indexOf('tv/') > -1) {
			var id = url.substring(url.indexOf('tv/'));
			repeatCount.channels[id] = (repeatCount.channels[id] != null) ? repeatCount.channels[id] + 1 : 1;
		} else if(url.indexOf('videos/') > -1) {
			var id = url.substring(url.indexOf('videos/'));
			repeatCount.videos[id] = (repeatCount.videos[id] != null) ? repeatCount.videos[id] + 1 : 1;
		} else if(url.indexOf('celebrities/') > -1) {
			var id = url.substring(url.indexOf('celebrities/'));
			repeatCount.celebrities[id] = (repeatCount.celebrities[id] != null) ? repeatCount.celebrities[id] + 1 : 1;
		}
	}
	return repeatCount;
}

function extractUrlFromItem(htmlItem, $) {
	// console.log(htmlItem);
	var urls = {};
	$(htmlItem).find('a').each(function() {
		var url = $(this).attr('href');
		urls[url] = (urls[url] != null) ? urls[url] + 1 : 1;
	});

	var dominatedUrl;
	for (var key in urls) {
		if(!dominatedUrl || urls[key] > urls[dominatedUrl]) {
			dominatedUrl = key;
		}
	}
	return dominatedUrl;
}

module.exports = router;
