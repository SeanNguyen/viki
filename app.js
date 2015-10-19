var request = require('request');
var cheerio = require('cheerio');
var q = require('q');
var phantom = require('phantom');

var vikiHomePageUrl = 'https://www.viki.com';
var $;

function main() {
	//analyze once with out executing page javascript
	console.log("ANALYZE VIKI.COM WITHOUT JAVASCRIPT");
	request(vikiHomePageUrl, function(error, response, html){
		if(!error){
			analyzeHtmlPage(html);
		} else {
			console.log("Fail to open viki.com");
		}
	});

	//analyze again with javascript being executed
	//create a phantomJS instance and load "viki.com"
	phantom.create(function (ph) {
		ph.createPage(function (page) {
		    page.open(vikiHomePageUrl, function (status) {
			    if(status === 'success') {
			    	console.log("==================================================================");
			    	console.log("ANALYZE VIKI.COM WITH JAVASCRIPT BEING EXECUTED");
					console.log("Successful connected to viki.com");
			    	console.log("Simulating script in viki.com page...");
					page.evaluate(function () { 
						return document; 
					}, function (document) {
						console.log("Start analyze html document...");
						ph.exit();

						var htmlDocument = document.all[0].outerHTML;
						analyzeHtmlPage(htmlDocument);
					});
				} else {
					console.log("Fail to open viki.com");
				}
		    });
	  	});
	});
}

function analyzeHtmlPage(htmlDocument) {
	$ = cheerio.load(htmlDocument);

	q.all([	getUrlsfromHtmlClass('.item'), getUrlsfromHtmlClass('.c-item')])
	.then(function(results) {
		var items = results[0];
		var items = items.concat(results[1]);
		
		var itemCount = countDuplicatedItems(items);
		printResult(itemCount);
	})
	.catch(function(err) {
		console.log(err);
	});
}

function countDuplicatedItems(items) {
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

/*
*	get video, channel, celebrity url from an html element
* 	return promise
*/
function extractUrlFromItem(htmlItem) {
	var defer = q.defer();
	//get urls from href links
	var urls = {};
	$(htmlItem).find('a').each(function() {
		var url = $(this).attr('href');
		url = getPathFromAbsoluteUrl(url);
		urls[url] = true;
	});
	
	//get urls via tooltips
	if($(htmlItem).find('.thumbnail-tooltip').length === 0) {
		defer.resolve(urls);
	} else {
		$(htmlItem).find('.thumbnail-tooltip').each(function() {
			var apiPath = $(this).attr('data-tooltip-src');
			if(!apiPath || apiPath == 'undefined') {
				defer.resolve(urls);
				return;
			}
			var apiUrl = vikiHomePageUrl + apiPath;
			request(apiUrl, function(error, response, body) {
				if(error || response.statusCode != 200) {
					defer.resolve(urls);
					return;
				}
				var bodyJson = JSON.parse(body);
				urls[bodyJson.path] = true;
				defer.resolve(urls);
			})
		});
	}
	return defer.promise;
}

/*
*	cut url so that all similar url will have the same form, so that can be use to be id for entities
*/
function getPathFromAbsoluteUrl(url) {
	if(!url) {
		return '';
	} else if(url.indexOf('tv/') > -1) {
		return url.substring(url.indexOf('tv/'));
	} else if(url.indexOf('videos/') > -1) {
		return url.substring(url.indexOf('videos/'));
	} else if(url.indexOf('celebrities/') > -1) {
		return url.substring(url.indexOf('celebrities/'));
	}
	return '';
}

/*
*	get all url of entities from a specific class
* 	return promise
*/
function getUrlsfromHtmlClass(htmlClass) {
	var defer = q.defer();
	var urls = [];
	var elementCount = $(htmlClass).length;
	var promises = $(htmlClass).each(function() {
		extractUrlFromItem(this)
		.then(function(paths) {
			for(var key in paths) {
				urls.push(key);	
			}
			if(--elementCount === 0) {
				defer.resolve(urls);
			}
		})
		.catch(function(err) {
			defer.reject(err);
		});
	});
	return defer.promise;
}

/*
* 	print report result
*/
function printResult(itemCount) {
	console.log('THE FOLLOWING ELEMENTS ARE DUPLICATED');
	for(var type in itemCount) {
		console.log(type);
		var noDuplication = true;
		for(var key in itemCount[type]) {
			var items = itemCount[type];
			if(items[key] > 1) {
				console.log("\t" + key + ' - (No of item presenting: ' + items[key] + ')');
				noDuplication = false;
			}
		}
		if(noDuplication) {
			console.log('\t There are no duplication for this type of entity');
		}
	}
}

main();