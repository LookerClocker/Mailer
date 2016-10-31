var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var fs = require('fs');
var cheerio = require('cheerio');

var mandrill = require('mandrill-api/mandrill'),
    mandrill_client = new mandrill.Mandrill('GJNenewolLmIAzBG8_4f3g');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// RETURN FILE WITH ENGLISH OR FRENCH KEYS AND VALUES
function getTranslationData() {
    var defaultLanguage = 'fr';
    var data = require('./data/translation-' + defaultLanguage + '.json');
    return data;
}

var data = getTranslationData();

// ROUTE WHICH ACCEPTS POST REQUEST
app.post('/test-page', function (req, res) {
    var fromEmail = req.body.fromEmail,
        fromName = req.body.fromName,
        subject = req.body.subject,
        recipients = req.body.to,
        baseUrl = req.body.baseUrl,
        postUrl = req.body.postUrl,
        postToken = req.body.postToken,
        campaignTitle = req.body.campaignTitle,
        // for created campaign
        campaignMaxRevenue = req.body.campaignMaxRevenue,
        campaignName = req.body.campaignName,

        // SENDING CHOSEN VIEW TO RENDER AS EMAIL TEMPLATE
        html = ejs.renderFile('./views/campaign_registration.ejs', {data: data}, function (err, result) {
            if (err) {
                console.log(err);
            }
            if (result) {
                html = result;
                // renderFile IS ASYNC FUNCTION SO I NEED TO SENT MESSAGE IN CALLBACK
                sendEmail();
            }
        });
    // SENDING EMAIL USING MANDRILL
    function sendEmail() {
        var to = [];

        // CHECK IF RECIPIENTS IS ARRAY AND PUSH DATA
        if (typeof recipients === 'string') {
            toUser = {
                email: recipients,
                type: 'to'
            };
            to.push(toUser);
        } else {
            for (var i = 0, l = recipients.length; i < l; i++) {
                var toUser = {
                    email: recipients[i],
                    type: "to"
                };
                to.push(toUser);
            }
        }
        // GET ACCESS TO THE DOM AND MODIFY IT`S ELEMENTS
        var $ = cheerio.load("'" + html + "'");

        bindToHtml();

        mandrill_client.messages.send({
            "message": {
                "from_email": fromEmail,
                "from_name": fromName,
                "to": to,
                "subject": subject,
                "baseUrl": baseUrl,
                "postUrl": postUrl,
                "postToken": postToken,
                "campaignTitle": campaignTitle,
                "campaignMaxRevenue": campaignMaxRevenue,
                "campaignName": campaignName,
                "html": $.html()
            }
        });

        function bindToHtml() {

            $('#logo').attr('src', baseUrl + $('#logo').attr('src'));

            $('#facebook').attr('src', baseUrl + $('#facebook').attr('src'));
            $('#linkedin').attr('src', baseUrl + $('#linkedin').attr('src'));
            $('#twitter').attr('src', baseUrl + $('#twitter').attr('src'));

            $('#ios').attr('src', baseUrl + $('#ios').attr('src'));
            $('#android').attr('src', baseUrl + $('#android').attr('src'));

            $('#campaignImage').attr('src', baseUrl + $('#campaignImage').attr('src'));
            $('#newCampaignTitle').text(campaignTitle);
            $('#newCampaignName').text(campaignName);

            // $('#postUrl').attr('src', baseUrl + postUrl);

            $('#postUrl').attr('src', postUrl);
            // REGISTARTION CAMPAIGN
            $('#step1').attr('src', baseUrl + $('#step1').attr('src'));
            $('#step2').attr('src', baseUrl + $('#step2').attr('src'));
            $('#step3').attr('src', baseUrl + $('#step3').attr('src'));


            // FORGOT PASSWORD CAMPAIGN
            var reference = baseUrl + $('#changePasswordTitle').text() + postToken,
                publishHref = baseUrl + $('#pubishAccount').attr('href');

            $('#changePasswordHref').attr('href', reference);
            $('#changePasswordTitle').text(reference);
            $('#pubishAccount').attr('href', publishHref);
            $('#new-campaign-body-var').text(campaignMaxRevenue);
        }
    }

    // OUTPUT AND CHECK RESULT
    res.send(subject + ' ' + recipients + ' ' + fromEmail + ' ' + fromName + '' + html);
});

app.get('/view-email/campaign_created', function (req, res) {
    res.render('campaign_created', {data: data});
});

app.get('/view-email/campaign_created', function (req, res) {
    res.render('campaign_created', {data: data});
});

app.get('/view-email/campaign_registration', function (req, res) {
    res.render('campaign_registration', {data: data});
});

app.get('/view-email/forget_password', function (req, res) {
    res.render('campaign_forget_password', {data: data});
});

app.listen(8080);
console.log('8080 is the magic port');

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});