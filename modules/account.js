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
        q = "SELECT Id, Name, NMA__c, Dollar_NMA__c FROM Land_Holding__c WHERE Account__r.Name LIKE '%" + req.body.text + "%'";

    force.query(oauthObj, q)
        .then(data => {
            landHoldings = JSON.parse(data).records;
            res.send("An error as occurred " + landHoldings.length);
            if (landHoldings && landHoldings.length>0) {
                let attachments = [];
                landHoldings.forEach(function(landHolding) {
                    let fields = [];
                    fields.push({title: "Name", value: landHolding.Name, short:true});
                    fields.push({title: "NMA", value: landHolding.NMA__c, short:true});
                    fields.push({title: "Dollar/NMA", value: landHolding.Dollar_NMA__c, short:true});
                    fields.push({title: "Open in Salesforce:", value: oauthObj.instance_url + "/" + landHolding.Id, short:false});
                    attachments.push({color: "#7F8DE1", fields: fields});
                });
                res.json({text: "Land Holdings Belonging To '" + req.body.text + "':", attachments: attachments});
            } else {
                res.send("No records");
            }
        }).catch(error => {
            if (error.code == 401) {
                res.send(`Visit this URL to login to Salesforce: https://${req.hostname}/login/` + slackUserId);
            } else {
                res.send("An error as occurred " + error.body);
            }
        });
};
