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
        q = "SELECT Id, Name, Phone FROM Account WHERE Name LIKE '%" + req.body.text + "%' LIMIT 1";

    let account = [];

    force.query(oauthObj, q)
        .then(data => {
            account = JSON.parse(data).records;

            if(account && account.length > 0) {
                let attachments = [];
                let fields = [];

                fields.push({title: "Name", value: account[0].Name, short: true});
                fields.push({title: "Phone", value: account[0].Phone, short: true});
                fields.push({title: "Open in Salesforce:", value: oauthObj.instance_url + "/" + account[0].Id, short: false});
                attachments.push({color: "#236fbd", fields: fields});

                let lhQ = "SELECT Id, Name, NMA__c, Dollar_NMA__c FROM Land_Holding__c WHERE Account__c = '" + account[0].Id + "'";

                force.query(oauthObj, lhQ)
                        .then(data => {
                            let landHoldings = JSON.parse(data).records;

                            if (landHoldings && landHoldings.length>0) {
                                landHoldings.forEach(function(landHolding) {
                                    let flds = [];
                                    flds.push({title: "Name", value: landHolding.Name, short:true});
                                    flds.push({title: "NMA", value: landHolding.NMA__c, short:true});
                                    flds.push({title: "Dollar/NMA", value: landHolding.Dollar_NMA__c, short:true});
                                    flds.push({title: "Open in Salesforce:", value: oauthObj.instance_url + "/" + landHolding.Id, short:false});
                                    attachments.push({color: "#6b3021", fields: flds});
                                });
                                res.json({text: "Land Holdings Belonging To '" + account[0].Name + "':", attachments: atts});
                            } else {
                                res.send("No Land Holding records");
                            }
                        }).catch(error => {
                            if (error.code == 401) {
                                res.send(`Visit this URL to login to Salesforce: https://${req.hostname}/login/` + slackUserId);
                            } else {
                                res.send("An error as occurred " + error);
                            }
                });
            } else {
                res.send("No Account records");
            }
        }).catch(error => {
            if (error.code == 401) {
                res.send(`Visit this URL to login to Salesforce: https://${req.hostname}/login/` + slackUserId);
            } else {
                res.send("An error as occurred " + error);
            }
        });
};
