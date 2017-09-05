"use strict";

let auth = require("./slack-salesforce-auth"),
    force = require("./force"),
    ACCOUNT_TOKEN = process.env.SLACK_ACCOUNT_TOKEN;

exports.execute = (req, res) => {

    if (req.body.token != ACCOUNT_TOKEN) {
        console.log("Invalid token");
        res.send("Invalid token");
        return;
    }

    let slackUserId = req.body.user_id,
        oauthObj = auth.getOAuthObject(slackUserId),
        q = "SELECT Id, Name, Phone, BillingAddress FROM Account WHERE Name LIKE '%" + req.body.text + "%' LIMIT 1",
        lhQ = "SELECT Id, Name, NMA__c, Dollar_NMA__c FROM Land_Holding__c WHERE Id = :accounts[0]";

    var accounts;

    force.query(oauthObj, q)
        .then(data => {
            accounts = JSON.parse(data).records;
            if (accounts && accounts.length>0) {
                let attachments = [];
                accounts.forEach(function(account) {
                    let fields = [];
                    fields.push({title: "Name", value: account.Name, short:true});
                    fields.push({title: "Phone", value: account.Phone, short:true});
                    if (account.BillingAddress) {
                        fields.push({title: "Address", value: account.BillingAddress.street, short:true});
                        fields.push({title: "City", value: account.BillingAddress.city + ', ' + account.BillingAddress.state, short:true});
                    }
                    fields.push({title: "Open in Salesforce:", value: oauthObj.instance_url + "/" + account.Id, short:false});
                    attachments.push({color: "#7F8DE1", fields: fields});
                });
                res.json({text: "Accounts matching '" + req.body.text + "':", attachments: attachments});
            } else {
                res.send("No records");
            }
        }).then(data => {
            let landHoldings = JSON.parse(data).records;

            if(accounts && landHoldings && landHoldings.length > 0) {
                let attachments = [];

                landHoldings.forEach(function(landHolding) {
                    let fields = [];
                    fields.push({title: "Name", value: landHolding.Name, short: true});
                    fields.push({title: "NMA", value: landHolding.NMA__c, short: true});
                    fields.push({title: "$/NMA", value: landHolding.Dollar_NMA__c, short: true});
                    attachments.push({color: "#6b3021", fields: fields});
                });
                res.json({text: "Land Holdings: ", attachments: attachments});
            } else {
                res.send("No records");
            }
        }).catch(error => {
            if (error.code == 401) {
                res.send(`Visit this URL to login to Salesforce: https://${req.hostname}/login/` + slackUserId);
            } else {
                res.send("An error as occurred");
            }
        });
};
