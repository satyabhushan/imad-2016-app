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

app.get('/ui/ab.png', function (req, res) {
    res.sendFile(path.join(__dirname, 'ui', 'ab.png'));
})

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

app.get('/555',function(req,res){
    console.log(req.connection.remoteAddress);
    if(req.connection.remoteAddress)
    pool.query('INSERT INTO "visiters" ("visitersIP") VALUES ($1)',[req.connection.remoteAddress],function(err,result){
        if(err){
            console.log(err);
        }else{
            console.log('noerr');
        }
    });
});

app.get('/logout/:url',function(req,res){
    var template = '', url = decodeURIComponent(req.params.url);

    if(req.session && req.session.auth && req.session.auth.user){
        delete req.session.auth.user;
        template = '<html><head><script>window.location.replace("'+url+'")</script></head><body>logging out ...</body></html>';
    }else{
        template = '<html><head></head><body></body></html>';
    }
     res.send(template);
});

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


app.get('/logout/:url',function(req,res){
    var template = '', url = decodeURIComponent(req.params.url);

    if(req.session && req.session.auth && req.session.auth.user){
        delete req.session.auth.user;
        template = '<html><head><script>window.location.replace("'+url+'")</script></head><body>logging out ...</body></html>';
    }else{
        template = '<html><head></head><body></body></html>';
    }
     res.send(template);
});

app.post('/777',function(req,res){
    var data = {}
    var webid = req.body.webid;
    if(webid === 0){
        req.body.email ? pool.query("SELECT email from users where email=$1",[req.body.email],function(err,result){
            if(err){
                data.err = true;
                data.errdes = 'An Unkonwn error occur. Please try again later.';
                res.send(JSON.stringify(data));
            }else{
                if(result.rows.length === 0){
                    console.log(req.body)
                    if(req.body.usernm && req.body.pass){
                        var salt = crypto.randomBytes(128).toString('hex');
                        var pass = hash(req.body.pass,salt)
                        pool.query('insert into "users" (userfrom,username,email,password) values(0,$1,$2,$3)',[req.body.usernm,req.body.email,pass],function(err,result){
                            if(err){
                                data.err = true;
                                data.errdes = 'An Unkonwn error occur. Please try again later.';
                                res.send(JSON.stringify(data));
                            }else {
                                pool.query('select userid from "users" where email=$1 and username=$2',[req.body.email,req.body.usernm],function(err,result){
                                    if(err){
                                        data.err = true;
                                        data.errdes = 'Account has been successfully created.';
                                        res.send(JSON.stringify(data));
                                    }else{
                                        req.session.auth = {user: result.rows[0].userid};
                                        data.err = false;
                                        res.send(JSON.stringify(data));
                                    }
                                });
                            }
                        });
                    }else{
                        data.err = true;
                        data.errdes = 'An Unkonwn error occur. Please try again later.';
                        res.send(JSON.stringify(data));
                    }
                }else{
                    data.err = true;
                    data.errdes = 'This email address already in use.';
                    res.send(JSON.stringify(data));
                }
            }
        }) : '';
    }else if(webid === 1 || webid === 2){
        var email = req.body.email,
            usernm = req.body.usernm,
            picture = req.body.picture,
            userwebid = req.body.userwebid;
        if(userwebid){
            pool.query('SELECT * from "users" where (email=$1) or (userfrom=$2 and userwebid=$3)',[email,webid,userwebid],function(err,result){
                if(err){
                    data.err = true;
                    data.errdes = 'An Unkonwn error occur. Please try again later.';
                    res.send(JSON.stringify(data));
                }else{
                    if(result.rows.length === 1){
                        var userid = result.rows[0].userid
                        if( result.rows[0].userfrom == 0 && !result.rows[0].userwebid){
                            pool.query('update "users" set userfrom = $1, userwebid = $2,userpic = $3 where email=$4',[webid,userwebid,picture,email],function(err,result){
                                if(err){
                                    data.err = true;
                                    data.errdes = 'An Unkonwn error occur. Please try again later.';
                                    res.send(JSON.stringify(data));
                                }else {
                                    req.session.auth = {user: userid};
                                    data.err = false;
                                    res.send(JSON.stringify(data));
                                }
                            });
                        }else{
                            console.log('@')
                            req.session.auth = {user: userid};
                            data.err = false;
                            res.send(JSON.stringify(data));
                        }
                    }else if(result.rows.length === 0){
                        pool.query('insert into "users" (userfrom,username,userwebid,userpic,email) values($1, $2, $3, $4, $5)',[webid,usernm,userwebid,picture,email],function(err,result){
                            if(err){
                                data.err = true;
                                data.errdes = 'An Unkonwn error occur. Please try again later.';
                                res.send(JSON.stringify(data));
                            }else {
                                pool.query('select userid from "users" where userfrom= $1 and userwebid= $2',[webid,userwebid],function(err,result){
                                    if(err){
                                        data.err = true;
                                        data.errdes = 'Account has been successfully created.';
                                        res.send(JSON.stringify(data));
                                    }else{
                                        req.session.auth = {user: result.rows[0].userid};
                                        data.err = false;
                                        res.send(JSON.stringify(data));
                                    }
                                });
                            }
                        });                        
                    }
                }
            })
        }else{
            data.err = true;
            data.errdes = 'An Unkonwn error occur. Please try again later.';
            res.send(JSON.stringify(data));
        }
    }else{
        data.err = true;
        data.errdes = 'An Unkonwn error occur. Please try again later.';
        res.send(JSON.stringify(data));
    }
});

app.post('/776',function(req,res){
    var data = {};
    console.log(req.body)
    if(req.body.webid === 0){
        if(!!req.body.email){
            pool.query("SELECT * from users where email=$1",[req.body.email],function(err,result){
                if(err){
                    data.err = true;
                    data.errdes = 'An Unkonwn error occur. Please try again later.';
                    res.send(JSON.stringify(data));
                }else{
                    if(result.rows.length === 1){
                        var dbpass = result.rows[0].password;
                        var inpass = req.body.pass;
                        var salt = dbpass.split('$')[2];
                        console.log(inpass,salt)
                        var haspass = hash(inpass,salt);
                        if(haspass == dbpass){
                            req.session.auth = {user: result.rows[0].userid};
                            data.err = false;
                            res.send(JSON.stringify(data));
                        }else{
                            data.err = true;
                            data.errdes = 'Incorrect email id or password.';
                            res.send(JSON.stringify(data));
                        }
                    }else {
                        data.err = true;
                        data.errdes = 'Incorrect email id or password.';
                        res.send(JSON.stringify(data));
                    }
                }
            })
        }
    }else {
        data.err = true;
        data.errdes = '5An Unkonwn error occur. Please try again later.';
        res.send(JSON.stringify(data));
    }
});

app.get('/886/:id',function(req,res){
    var data = {},
        tagid = req.params.id,
        usrid;
        console.log(tagid)
    if( islogin(req) ){
        usrid = req.session.auth.user;
        pool.query('insert into usrflwngtg(userid,tagid) select $1, tagid from tags a where a.tagid=$2 and a.tagid not in (select b.tagid from usrflwngtg b where b.userid=$3)',[usrid,tagid,usrid],function(err,result){
            if(err){
                data.err = true;
                data.errdes = 'An Unkonwn error occur. Please try again later.';
                res.send(JSON.stringify(data));
            }else{
                data.err = true;
                data.errdes = 'Followed';
                res.send(JSON.stringify(data));
            }
        });
    }else{
        data.err = true;
        data.errdes = 'Sorry! You can not follow. First you need to login.';
        res.send(JSON.stringify(data));
    }
});

app.get('/887/:id',function(req,res){
    pool.query("select a.artid,a.arttit,a.arttit,a.artdes,d.tagid,d.tagimg,d.tagname from articles a inner join tagscon b on a.artid = b.tagartid "+ (islogin(req) ? " inner join usrflwngtg c on b.tagid  = c.tagid and c.userid = "+req.session.auth.user+" left join tags d on d.tagid=b.tagid" : " left join tags d on d.tagid=b.tagid where b.tagid = 1 or b.tagid = 2 or b.tagid = 8 or b.tagid = 6 ")+" ORDER by random()",function(err,result){
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
                                    if(err){
                                       res.status(500).send(err.toString());
                                    }else{
                                        artdet.nooflikes = result.rows[0].nol;
                                        if(islogin(req)){
                                            var user = req.session.auth.user;
                                            pool.query("SELECT * from likes a where a.artid = "+artid+" and a.userid="+user,function(err,result){
                                                if(err){
                                                    console.log(err);
                                                   res.status(500).send(err.toString());
                                                }else{
                                                    var mylk = result.rows.length == 1 ? 'true' : 'false'; 
                                                    pool.query("SELECT * from comments a where a.comartid = "+artid+" and a.comuserid="+user,function(err,result){
                                                        if(err){
                                                            console.log(err);
                                                           res.status(500).send(err.toString());
                                                        }else{
                                                            var mycom = result.rows.length >= 1 ? 'true' : 'false';
                                                            artdet.mylk = mylk;
                                                            artdet.mycom = mycom;
                                                            console.log(artdet,1);
                                                            isloggedin(req,res,artdet);
                                                        }
                                                    });
                                                }
                                            });
                                        }else{
                                            console.log(artdet,2);
                                            isloggedin(req,res,artdet);
                                        }
                                       //artdet = { meta : isloggedin(req), otherdata: artdet };
                                       //res.send(JSON.stringify(artdet));
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

app.get('/988',function(req,res){
    var artid = req.query['artid'],
        lstcomid = req.query['lstcomid'],
        data = {};
    pool.query("SELECT b.userid as userid,b.username as username,b.userpic as userpic,a.comid as comid,a.comtime as comtime,a.comment as comment from comments a,users b where b.userid = a.comuserid and a.comartid = "+artid+" and a.comid >"+lstcomid+" order by a.comid desc limit 10",function(err,result){
       if(err){
            data.err = true;
            data.errdes = 'Sorry! You can not follow. First you need to login.';
            res.send(JSON.stringify(data));       
        } else{
            console.log(result.rows)
            data.err = false;
            data.errdes = 'Done';
            data.otherdata = result.rows;
            console.log(data.otherdata)
            res.send(JSON.stringify(data)); 
       }
    });
});

app.post('/989',function(req,res){
    var artid = req.body['artid'],
        lstcomid = req.body['lstcomid'],
        tosave = req.body['comment'],
        data = {},
        time =new Date().getTime();
    if(islogin(req)){
        var user = req.session.auth.user;
        pool.query('insert into comments (comartid,comuserid,comtime,comment) values($1,$2,$3,$4)',[artid,user,time,tosave],function(err,result){
            if(err){
                data.err = true;
                data.errdes = '1An unknown error occur.';
                res.send(JSON.stringify(data));       
            } else{
                pool.query("SELECT b.userid as userid,b.username as username,b.userpic as userpic,a.comid as comid,a.comtime as comtime,a.comment as comment from comments a,users b where b.userid = a.comuserid and a.comartid = "+artid+" and a.comid >"+lstcomid+" order by a.comid desc",function(err,result){
                    if(err){
                        data.err = true;
                        data.errdes = '2An unknown error occur.';
                        res.send(JSON.stringify(data));       
                    } else{
                        data.otherdata = result.rows;
                        pool.query("SELECT count(a.comartid) as noc from comments a where a.comartid = "+artid,function(err,result){
                            if(err){
                                data.err = true;
                                data.errdes = '2An unknown error occur.';
                                res.send(JSON.stringify(data));       
                            } else{
                                data.noc = result.rows[0].noc;
                                pool.query("SELECT * from comments a where a.comartid = "+artid+" and a.comuserid="+user,function(err,result){
                                    if(err){
                                        data.err = true;
                                        data.errdes = '2An unknown error occur.';
                                        res.send(JSON.stringify(data));       
                                    } else{
                                        data.err = false;
                                        data.errdes = 'Done';
                                        data.mycom = result.rows.length >=1 ? 'true':'false';
                                        res.send(JSON.stringify(data)); 
                                    }
                                })
                            }
                        })
                    }
                });
            }
        })
    }else{
        data.err = true;
        data.errdes = 'You are not logged in.';
        res.send(JSON.stringify(data));  
    }
})

app.get('/990',function(req,res){
    var artid = req.query['artid'],data = {};
    console.log(artid)
    if(islogin(req)){
        var user = req.session.auth.user;
        pool.query("SELECT * from likes a where a.artid = "+artid,function(err,result){
            if(err){
                console.log(err);
                data.err = true;
                data.errdes = '1An unknown error occur.';
                res.send(JSON.stringify(data));       
            } else{
                var nol = result.rows.length;
                var isexist = false;
                data.nol = nol;
                for(var i=0;i<nol;i++){
                    if(result.rows[i].artid == artid &&  result.rows[i].userid == user){
                        isexist =true; break;
                    }
                    isexist = false;
                }
                if(isexist){
                    pool.query("delete from likes a where a.artid = "+artid+" and a.userid="+user,function(err,result){
                        if(err){
                            data.err = true;
                            data.errdes = 'An unknown error occur.';
                            res.send(JSON.stringify(data));       
                        } else{
                            data.err = false;
                            data.errdes = 'Unliked';
                            data.mylk = 'false';
                            data.nol -=1;
                            res.send(JSON.stringify(data));
                        } 
                    });
                }else{
                    pool.query('insert into likes (artid,userid) values($1,$2)',[artid,user],function(err,result){
                        if(err){
                            data.err = true;
                            data.errdes = 'An unknown error occur.';
                            res.send(JSON.stringify(data));       
                        } else{
                            data.err = false;
                            data.errdes = 'Liked';
                            data.mylk = 'true';
                            data.nol +=1;
                            res.send(JSON.stringify(data));
                        } 
                    })
                }
            }
        })
    }else{
        data.err = true;
        data.errdes = 'You are not logged in.';
        res.send(JSON.stringify(data));        
    }
})

var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});