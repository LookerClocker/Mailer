var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var fs = require('fs');

// var mandrill = require('./public/javascripts/mandrill-API.js');
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

function getFile() {
    var defaultLanguage = 'en';
    var data = require('./data/translation-' + defaultLanguage + '.json');
    return data;
}

var data = getFile();

app.post('/test-page', function (req, res) {
    var fromEmail = req.body.fromEmail,
        fromName = req.body.fromName,
        subject = req.body.subject,
        recipients = req.body.recipients,
        html = ejs.renderFile('./views/campaign_created.ejs', {data: data}, function (err, result) {
            if(err) {
                console.log(err);
            }
            if (result) {
                html = result;
                sendEmail(html);
            }
        });

    function sendEmail() {
        mandrill_client.messages.send({
            "message": {
                "from_email": fromEmail,
                "from_name": fromName,
                "to": [{"email": recipients}],
                "subject": subject,
                "html": html
            }
        });
    }

    res.send(subject + ' ' + recipients + ' ' + fromEmail + ' ' + fromName + ''+ html );
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