/*var express = require('express');
var morgan = require('morgan');
var path = require('path');*/
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
    cookie:{maxAge:1000*60*60*24*30}
}));

var Pool = require('pg').Pool;
var config = {
    user: 'satyabhushan',
    database:'satyabhushan',
    host:'db.imad.hasura-app.io',
    port:'5432',
    password:process.env.DB_PASSWORD
};

var pool = new Pool(config);

app.post('/hash',function(req,res){
    //var tc=req.params.input;
    //var tc2=hash(tc,'random-string');
    //delete req.session.auth;
    req.session.auth = {'user' : 'awesome'};
    res.send('logged in');
});

app.get('/new',function(req,res){
    if(req.session && req.session.auth && req.session.auth.user){
        res.send('working');
    }else {
         res.send('not working');
    }
});

function hash(inputstring,salt)
{
    var hashed=crypto.pbkdf2Sync(inputstring,salt, 100000, 512, 'sha512');
    return ["pbkdf2","10000",salt,hashed.toString('hex')].join('$');
}

/*app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});*/

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

function isloggedin(){
    if(req.session && req.session.auth && req.session.auth.user){
        return true;
    }else {
        return false;
    }
}

app.get('/887/:id',function(req,res){
    //if(req.session && req.session.auth && req.session.auth.user){
        pool.query('SELECT a.artid,a.arttit,a.artdes,a.arttime,a.artuserid,c.tagid,c.tagname FROM articles a left JOIN tagscon b ON a.artid = b.tagartid left JOIN tags c on b.tagid=c.tagid',function(err,result){
            if(err){
                res.status(500).send(err.toString());
            }else{
                var data=[],check=[],ind=-1,nol,noc;
                for(var i=0,l=result.rows.length;i<l;i++){
                    ind = check.indexOf(result.rows[i].artid);
                    if(ind>-1){
                        data[ind].tags.push({tagid:result.rows[i].tagid,tagname:result.rows[i].tagname});
                    }else{
                        /*pool.query("SELECT sum(1) as noc from likes a where="+result.rows[i].artid,function(err,result){
                            nol = result.rows[0].noc || 0;
                            pool.query("SELECT sum(1) as nol from comments a where="+result.rows[i].artid,function(err,result){
                                noc = result.rows[0].nol || 0;
                                check.push(result.rows[i].artid);
                                data.push({artid:result.rows[i].artid,arttit:result.rows[i].arttit,artdes:result.rows[i].artdes,arttime:result.rows[i].arttime,artuserid:result.rows[i].artuserid,noc:noc,nol:nol,tags:[{tagid:result.rows[i].tagid,tagname:result.rows[i].tagname}]});
                                
                            });
                        });*/
                        check.push(result.rows[i].artid);
                        data.push({artid:result.rows[i].artid,arttit:result.rows[i].arttit,artdes:result.rows[i].artdes,arttime:result.rows[i].arttime,artuserid:result.rows[i].artuserid,tags:[{tagid:result.rows[i].tagid,tagname:result.rows[i].tagname}]});
                    }
                }
                var ran = Math.floor(Math.random()*13);
                pool.query("SELECT tagid,tagname,tagimg from tags where tagid="+(ran%5+1)+" or tagid="+(ran%5+2)+" or tagid="+(ran%5+3)+" or tagid="+(ran%5+4)+" or tagid="+(ran%5+5)+"",function(err,result){
                    data = { arts: data,kftags: result.rows };
                    data = { isloggedin : isloggedin(), otherdata: data  };
                    res.send(JSON.stringify(data));                    
                });
            }
        });
    //}else {
         //res.send('not working');
    //}
    
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
                                       artdet = { isloggedin : isloggedin(), otherdata: artdet };
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
/*var express = require('express');
var morgan = require('morgan');
var path = require('path');
var crypto = require('crypto');
var session=require('express-session');
var app = express();
var bodyParser=require('body-parser');
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    secret:'randomvalue',
    cookie:{maxAge:1000*60*60*24*30}
}));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

//hashing unit
app.get('/hash/:input',function(req,res){
    var tc=req.params.input;
    var tc2=hash(tc,'random-string');
    res.send(tc2);
});

function hash(inputstring,salt)
{
    var hashed=crypto.pbkdf2Sync(inputstring,salt, 100000, 512, 'sha512');
    return ["pbkdf2","10000",salt,hashed.toString('hex')].join('$');
}

//end here
//db connection
var Pool = require('pg').Pool;
var config = {
    user: 'satyabhushan',
    database:'satyabhushan',
    host:'db.imad.hasura-app.io',
    port:'5432',
    password:process.env.DB_PASSWORD
};

app.get('/ui/imad2.html', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'imad2.html'));
});

app.get('/987',function(req,res){
    res.send("USER IS CORRECT");
})

var pool = new Pool(config);
app.get('/test-db',function(req,res){
    pool.query("SELECT * from test",function(err,result){
       if(err){
           res.status(500).send(err.toString());
       } else{
         res.send(JSON.stringify(result.rows));  
       }
    });
});
//create user
app.post('/create-user',function(req,res){
    var username=req.body.username;
    var password=req.body.password;
    var salt=crypto.randomBytes(128).toString('hex');
    var dbString=hash(password,salt);
    pool.query("INSERT into user3(username,password) VALUES($1,$2)",[username,dbString],function(err,result){
       if(err){
           res.status(500).send(err.toString());
       } else{
         alert("Username created:"+username);
       } 
    });
});
//end here
//login user
app.post('/login',function(req,res){
    var username=req.body.username;
    var password=req.body.password;
    pool.query("SELECT * from user3 WHERE username=$1",[username],function(err,result){
       if(err){
           res.status(500).send(err.toString());
       } else if(result.rows.length===0){
             res.send('USERNAME OR PASSWORD IS INVALID');
         }
         else{
             var dbstring=result.rows[0].password;
             var salt=dbstring.split('$')[2];
             var hashedpassword=hash(password,salt);
             if(hashedpassword===dbstring){
                 req.session.auth={userid:result.rows[0].id};
                 res.send("USER IS CORRECT");
            }
        }
    });
});*/
 
 
 
