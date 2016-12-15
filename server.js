var express = require('express');
var morgan = require('morgan');
var path = require('path');
var crypto = require('crypto');
var session=require('express-session');

var app = express();
var bodyParser=require('body-parser');
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    secret:'46889',
    resave: true,
    saveUninitialized: true,
    cookie:{maxAge:1000*60*60*24*30}
}));

var Pool = require('pg').Pool;
var config = {
    user: 'satyabhushan',
    database:'satyabhushan',
    host:'db.imad.hasura-app.io',
    port:'5432',
    password: process.env.DB_PASSWORD
};

var pool = new Pool(config);


function hash(inputstring,salt)
{
    var hashed=crypto.pbkdf2Sync(inputstring,salt, 100000, 512, 'sha512');
    return ["pbkdf2","10000",salt,hashed.toString('hex')].join('$');
}

app.get('/ui/style.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'style.css'));
});

app.get('/ui/imad2.html', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'imad2.html'));
});

app.get('/ui/madi.png', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'madi.png'));
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/', 'imad3.html'));
});

app.get('/topic/:id',function(req,res){
    res.sendFile(path.join(__dirname, 'ui', 'imad2.html'));
});

function islogin(req){
    if(req.session && req.session.auth && req.session.auth.user){
        return true;
    }else{
        return false;
    }
}

function isloggedin(req,res,otherdata){
    var meta = {},data = {};
    if(req.session && req.session.auth && req.session.auth.user){
        console.log('1')
        pool.query("SELECT * from users where userid=$1",[req.session.auth.user],function(err,result){
            if(err){
                console.log('2')
                meta.loggedin = false;
            }else{
                if(result.rows.length === 1){
                    console.log('3')
                    meta.loggedin = true;
                    meta.userInfo = {id: result.rows[0].userid, webid:result.rows[0].userfrom, image:result.rows[0].userpic,email:result.rows[0].email,name:result.rows[0].username,uswebid:result.rows[0].userwebid };
                }else{
                    console.log('4')
                    meta.loggedin = false;
                }
            }
            data = {meta: meta, otherdata:otherdata};
            res.send(JSON.stringify(data));
        });
    }else {
        console.log('5')
        meta.loggedin = false;
        data = {meta: meta, otherdata:otherdata};
        res.send(JSON.stringify(data));
    }
}

app.get('/887/:id',function(req,res){
    pool.query("select a.artid,a.arttit,a.arttit,a.artdes,d.tagid,d.tagimg,d.tagname from articles a inner join tagscon b on a.artid = b.tagartid "+ (islogin(req) ? " inner join usrflwngtg c on b.tagid  = c.tagid and c.userid = 14  left join tags d on d.tagid=b.tagid" : " left join tags d on d.tagid=b.tagid where b.tagid = 1 or b.tagid = 2 or b.tagid = 8 or b.tagid = 6 ")+" ORDER by random()",function(err,result){
        if(err){
            console.log(err);
            res.status(500).send(err.toString());
        }else{
            var data=[],check=[],ind=-1,nol,noc;
            for(var i=0,l=result.rows.length;i<l;i++){
                ind = check.indexOf(result.rows[i].artid);
                if(ind>-1){
                    data[ind].tags.push({tagid:result.rows[i].tagid,tagname:result.rows[i].tagname});
                }else{
                    check.push(result.rows[i].artid);
                    data.push({artid:result.rows[i].artid,arttit:result.rows[i].arttit,artdes:result.rows[i].artdes,arttime:result.rows[i].arttime,artuserid:result.rows[i].artuserid,tags:[{tagid:result.rows[i].tagid,tagname:result.rows[i].tagname}]});
                }
            }

            pool.query("select * from tags t "+ (islogin(req) ? "where not exists (select 1 from usrflwngtg Where t.tagid=tagid and userid="+req.session.auth.user+")" : "")+ " ORDER BY RANDOM() limit 5",function(err,result){
                if(err){
                    console.log(err);
                    res.status(500).send(err.toString());
                }else{
                    data = { arts: data,kftags: result.rows };
                    isloggedin(req,res,data);
                }               
            });
        }
    });
    
});

app.get('/987/:id',function(req,res){
    var artid = req.params.id;
    //res.send(artid);
    pool.query("SELECT * from articles where artid = "+artid,function(err,result){
       if(err){
           res.status(500).send(err.toString());
       } else{
           if(result.rows.length === 0){
               res.status(404).send(err.toString('ARTICLE NOT FOUND'));
           }else{
               var artdet = result.rows[0];
               pool.query("SELECT c.tagid as tagid,c.tagname as tagname,c.tagimg as tagimg FROM articles a left JOIN tagscon b ON a.artid = b.tagartid left JOIN tags c on b.tagid=c.tagid where a.artid = "+artid,function(err,result){
                   if(err){
                           res.status(500).send(err.toString());
                   }else{
                        artdet.tags = result.rows;
                       pool.query("SELECT count(a.comartid) as noc from comments a where a.comartid = "+artid,function(err,result){
                           if(err){
                               res.status(500).send(err.toString());
                           }else{
                                artdet.noofcomments = result.rows[0].noc;
                               pool.query("SELECT count(a.artid) as nol from likes a where a.artid = "+artid,function(err,result){
                                    artdet.nooflikes = result.rows[0].nol;
                                    if(err){
                                       res.status(500).send(err.toString());
                                   }else{
                                       artdet = { isloggedin : isloggedin(req), otherdata: artdet };
                                       res.send(JSON.stringify(artdet));
                                   }
                               });
                           }
                       });
                   }
               });
           }
       }
    });
});

app.get('/988/:id',function(req,res){
    var artid = req.params.id;
     //res.send(artid);
    pool.query("SELECT b.userid as userid,b.username as username,b.userpic as userpic,a.comid as comid,a.comtime as comtime,a.comment as comment from comments a,users b where b.userid = a.comuserid and a.comartid = "+artid,function(err,result){
       if(err){
           res.status(500).send(err.toString());
       } else{
            res.send(JSON.stringify(result.rows));    
       }
    });
});

var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});