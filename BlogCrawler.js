const express = require('express');
const app = express();
const fs = require('fs');
var Feedly = require('feedly');
const APP_PORT = 1234;
let resultsAll = [];
let errorAll = [];
let emptyLinkAll = [];
let invaildData = [];
let date = new Date();

var f = new Feedly({
    client_id: 'sandbox',
    client_secret: 'sTdnABpJDCmpurfU',
    base: 'https://sandbox7.feedly.com',
    port: 8080
});

Feedly.prototype.getcontents = function(id, count, continuation, cb) {
    var input;
    input = {};
    if (continuation != null) {
        input.continuation = continuation;
    }
    if (count == null){
        input.count = 20;
    }else {
        input.count = count;
    }
    return this._requestURL(cb, "/v3/streams/" + (encodeURIComponent(id)) + "/contents", 'GET', input);
};

/*app.get('/', (req, res) => {*/
    resultsAll = [];
    errorAll = [];
    emptyLinkAll = [];
    invaildData = [];
    fs.readFile('json/test.json', (err, data) => {
        if (err) throw err;
        var jsonObj = JSON.parse(data);
        //console.log(jsonObj.length);

        // request 5 each time
        let go = ready(jsonObj, (obj) => {

            let mvpid = obj.MVPID;
            let link = obj.ProfileLink;
            //
            let index = link.lastIndexOf("\/");
            let linkEnd = link.substring(index, link.length);
            if (linkEnd == "/") {
                link = link.substring(0, link.length - 1);
            }

            let id = 'feed/' + link + '/rss';
            const count = 300;
            console.log(`requesting:\t${id}`);
            let p = f.getcontents(id, count);
            p.then(results => {
                results.mvpid = mvpid;
                results.profileLink = link;                
                resultsAll.push(results);

                if(results.items == null || results.items == ""){
                    emptyLinkAll.push(results.profileLink);
                }

                //unix 1451663999000(2016-01-01 23:59:59)
                if(results.updated < 1451663999000){
                    invaildData.push({"profileLink":results.profileLink,"updated":results.updated});
                }

            },error => {
                errorAll.push(error);
            });
            return p;
        }, () => {
            console.log("profilelink length:" + jsonObj.length);
            console.log("resultAll Length:" + resultsAll.length);
            console.log("errorAll Length:" + errorAll.length);
            console.log("emptyLinkAll Length:"+ emptyLinkAll.length);
            console.log("invaildData Length:"+ invaildData.length);
            
            
            let fileName = (date.getMonth()+1) + "" + date.getDate() + "_" + date.getHours() +""+ date.getMinutes() +""+ date.getSeconds();
            let success_msg = JSON.stringify(resultsAll);
            //let error_msg = JSON.stringify(errorAll);
            let emptyLink_msg = JSON.stringify(emptyLinkAll);
            let invaildData_msg = JSON.stringify(invaildData);
            fs.writeFileSync("./text/"+ fileName +".json", success_msg);
            fs.writeFileSync("./text/"+ fileName +"_error.json", errorAll);
            fs.writeFileSync("./text/"+ fileName +"_emptyLink.json", emptyLink_msg);
            fs.writeFileSync("./text/"+ fileName +"_invaildData.json", invaildData_msg);
            console.log("Done!");
        });
        go();
    });
/*}).listen(APP_PORT, (err) => {
    console.log('app is running and listening port is ' + APP_PORT);
});*/



let requestParallel = (formDatas, action) => {
    if (formDatas && formDatas.length) {
        return Promise.all(formDatas.map(d => action(d))).catch(error => {
            console.log("catch: "+error);
        });
    }
    return Promise.resolve([]); // invalid argument
};

let ready = (formDatas, action, callback, step = 5) => {
    let data = formDatas;
    let idx = 0;
    let callback_invoked = false;
    let next = () => {
        let formData = formDatas.slice(idx, idx + step);
        formData = formData.filter(d => d);
        if (!callback_invoked && !(formData && formData.length)) {
            callback_invoked = true;
            callback();
        }
        let p = requestParallel(formData, action);
        p.then(data => {
            idx += step;
            next();
        });
    };
    return next;
};