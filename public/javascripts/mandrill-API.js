
/** Config
 * - get mandrillAPIKey
 */
var _ = require('underscore');
var Q = require('q');
var config = require("../config/config.js");

/** Packages
 * - mandrill-api (mandrill) https://www.npmjs.org/package/mandrill-api
 * - ejs (for template) https://www.npmjs.org/package/ejs
 */
var fs = require("fs"),
    ejs = require('ejs'),
    mandrill = require('mandrill-api/mandrill'),
    mandrill_client = new mandrill.Mandrill('GJNenewolLmIAzBG8_4f3g');

// var T = require('./translations').T;


/** Email info
 * - put templates in folder: /src/mail_templates
 * - template suffix: html
 * - default encode: utf8
 * - default from email: no-reply@vyp.com
 * - default from name: vyp
 */
var TEMPLATE_PATH = __dirname + "/../mail_templates/",
    //LANG_SEPARATOR = "-",
    TEMPLATE_SUFFIX = ".html",
    TEMPLATE_ENCODE = "utf8",
    FROM_EMAIL_DEFAULT = config.emailSenderAddress,
    FROM_NAME_DEFAULT = config.emailSenderName;
EMAIL_ACCOUNTS_FOR_TEST = [
    "satgi@me.com"
];

var defaultLanguage = require('../../public/js/src/model/LanguagesField').defaultLanguage;

/** Render template and add a translation function T to the "data" object
 * @params:
 * - templateName: string, name of template. It is the name of the file used as template, without folder path and extension.
 * - data: json object, data for rendering the template. Must contain the property "lang" with the email language.
 */

function renderTemplate(templateName, data) {
    addTranslationFunction(data);
    // Idea of implementation: add in "data" an object "w" (wording) that contains all
    // the keys in the template with the translations in the current language.
    // Before, we didn't want to add the template translations in Lean Translation not to pollute it
    // with too many translations. To discuss. It could be local JSON translation files not synchronized
    // with Lean Translation.
    var templateFile = TEMPLATE_PATH + templateName + TEMPLATE_SUFFIX;
    var template = fs.readFileSync(templateFile, TEMPLATE_ENCODE);
    if (data) {
        return ejs.render(template, {data});//{data: data}
    } else {
        return ejs.render(template);
    }
}

var context = "Email template";
/**
 * Requires data to have the "lang" attribute with the language in which it is translated.
 * Otherwise, the default language is used.
 * @param data
 */
function addTranslationFunction(data) {
    if (_.isString(data.lang)) {
        data.lang = data.lang.toLowerCase();
    }
    var lang = data.lang || defaultLanguage;
    data.T = function(key) {
        return T(key, lang, context);
    }
}

/**  Send email
 * @params:
 * - recipients: array or string, list of recipient
 format:
 [
 "recipient1.email@example.com",
 "recipient2.email@example.com"
 ]
 or
 "recipient.email@example.com"

 * - html: string, the full HTML content to be sent
 * - subject: string, email subject
 * - fromEmail: string, the sender email address
 * - fromName: string, optional from name to be used
 * - text: string, optional full text content to be sent
 * - callback(result, error): function, callback of sending result
 */
function sendEmail(recipients, html, subject, fromEmail, fromName, text, callback) {

    var to = [];
    if (typeof recipients === "string") {
        toUser = {
            email: recipients,
            type: "to"
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

    var message = {
            to: to,
            html: html,
            subject: subject,
            from_email: fromEmail,
            from_name: fromName,
            text: text
        },
        async = true;
    mandrill_client.messages.send({
        "message": message,
        "async": async
    }, function (result) {
        if (typeof callback === 'function') {
            callback(result);
        }
    }, function (e) {
        // Mandrill returns the error as an object with name and message keys
        // console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
        if (typeof callback === 'function') {
            callback(null, e);
        }
    });
}

/** Send email with default sending settings
 * @This method will use default settings of fromEmail, fromName, empty text
 */
var sendEmailWithDefaultSettings = function(recipients, html, subject, callback) {
    sendEmail(recipients, html, subject, FROM_EMAIL_DEFAULT, FROM_NAME_DEFAULT, "", callback);
};

function sendRegistrationEmail(email, baseUrl, lang, firstName) {
    // Send an email when the account have been created.

    if (email) {
        _sendRegistrationEmail(email, {baseUrl: baseUrl, firstName: firstName, lang: lang}, function (result, error) {
            if (error) {
                console.error("The email could not be sent because a mandrill error occurred: " + error.name + ' - ' + error.message);
                // TODO the email could not be sent. It should be sent again later.
            }
        });
    } else {
        console.log("Won't send registration email because the email is invalid:", email);
    }
}

/** Send the email for new registration
 *	@params
 * - recipient: string, user's email
 * - data: json object, data for rendering the email template
 * - callback: function, callback function for the email sending result,
 takes to params: function(result, error) {}
 1. result: sending result, null if sending failed
 2. error: sending error, null if sending succeeded
 */
function _sendRegistrationEmail(recipient, data, callback) {
    var html = renderTemplate("registration", data);

    //config.emailRegistrationSubject
    sendEmailWithDefaultSettings(recipient, html, data.T('EMAIL_SUBJECT_USER_REGISTRATION'), callback);
}

/**
 * Send an email with a link to reset the password
 * @param recipient {string}, user's email
 * @param data {object}, json object data for rendering the email template
 * @param callback {function}, callback function for the email sending result,
 takes to params: function(result, error) {}
 1. result: sending result, null if sending failed
 2. error: sending error, null if sending succeeded
 */
function sendForgetPasswordEmail(recipient, data, callback) {
    var html = renderTemplate("forgetPassword", data);

    //config.emailForgetPasswordSubject
    sendEmailWithDefaultSettings(recipient, html, data.T('EMAIL_SUBJECT_FORGET_PASSWORD'), callback);
}

function sendEmailWithPromise(emails, templateName, data, subjectKey) {
    data.TEMPLATE_TITLE_KEY = subjectKey; // The email object is also used as HTML template <title>
    var html = renderTemplate(templateName, data); // Adds a translation function T while rendering

    var promises = [];
    _.each(emails, function(email) {

        var deferred = Q.defer();
        sendEmailWithDefaultSettings(email, html, data.T(subjectKey), function (result, error) {
            if (error) {
                deferred.reject(error);
            } else {
                console.log("Successfully sent email with template name:", templateName);
                deferred.resolve(result);
            }
        });
        promises.push(deferred.promise);
    });
    return Q.all(promises);

    //var deferred = Q.defer();
    //sendEmailWithDefaultSettings(emails, html, data.T(subjectKey), function (result, error) {
    //    if (error) {
    //        deferred.reject(error);
    //    } else {
    //        deferred.resolve(result);
    //    }
    //});
    //return deferred.promise;
}

/**
 * @param emails recipients
 * @param campaign campaign object to fill the template
 * @param baseUrl VYN application base URL (http(s):// + domain) for links in the email
 * @param lang email language
 * @return {*} a promise that fails if the emails have not been sent successfully.
 */
function sendCampaignCreatedEmail(emails, campaign, baseUrl, lang) {
    var data = {
        baseUrl: baseUrl,
        lang: lang,
        campaign: campaign
    };
    return sendEmailWithPromise(emails, "campaignCreated", data, 'EMAIL_SUBJECT_NEW_CAMPAIGN');
    //var promises = [];
    //_.each(emails, function(email) {
    //    promises.push(sendEmailWithPromise(emails, "campaignCreated", data, 'EMAIL_SUBJECT_NEW_CAMPAIGN'));
    //});
    //return Q.all(promises);
}

function sendCampaignReminderEmail(emails, campaign, baseUrl, lang) {
    var data = {
        baseUrl: baseUrl,
        lang: lang,
        campaign: campaign
    };
    return sendEmailWithPromise(emails, "campaignReminder", data, 'EMAIL_SUBJECT_NEW_CAMPAIGN_REMINDER');
    //var promises = [];
    //_.each(emails, function(email) {
    //    promises.push(sendEmailWithPromise(emails, "campaignCreated", data, 'EMAIL_SUBJECT_NEW_CAMPAIGN'));
    //});
    //return Q.all(promises);
}

/**
 * @param emails recipients
 * @param campaign campaign object to fill the template
 * @param baseUrl VYN application base URL (http(s):// + domain) for links in the email
 * @param lang email language
 * @return {*} a promise that fails if the emails have not been sent successfully.
 */
function sendCampaignFinishedEmail(emails, campaign, baseUrl, lang) {
    var data = {
        baseUrl: baseUrl,
        lang: lang,
        campaign: campaign
    };
    return sendEmailWithPromise(emails, "campaignFinished", data, 'EMAIL_SUBJECT_CAMPAIGN_FINISHED');
}

//var env = require('../../public/js/src/config/env');
//var emails = ['archi.truc@yahoo.fr'];
//var campaign = {campaignName: "New campaign", _id: "54f6c4f1a4ef3e3417bfc021"};
//sendCampaignCreatedEmail(emails, campaign, env.frontBaseUrl, 'fr').then(function(result) {
//    console.log("result:", result);
//}, function(error) {
//    console.error("error:", error);
//});
//sendCampaignFinishedEmail(emails, campaign, env.frontBaseUrl, 'fr').then(function (result) {
//    console.log("result:", result);
//}, function (error) {
//    console.error("error:", error);
//});

//try {
//    console.log("will send email");
//    sendRegistrationEmail("archi.truc@yahoo.fr", "http://www.localhost:8090", "fr", "Moi");
//    console.log("asked to send email");
//} catch(err) {
//    console.error(err);
//    console.error(err.stack);
//}


module.exports = exports = {
    sendEmail: sendEmail,
    sendRegistrationEmail: sendRegistrationEmail,
    sendForgetPasswordEmail: sendForgetPasswordEmail,
    sendCampaignReminderEmail: sendCampaignReminderEmail,
    sendCampaignCreatedEmail: sendCampaignCreatedEmail,
    sendCampaignFinishedEmail: sendCampaignFinishedEmail
};