
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const fs = require('fs');

const Game = require('./static/lib/game.js').Game;

const Chess = require('chess.js').Chess;


function strip(s) { return s.replace(/^\s*/, '').replace(/\s*$/, '') }

function random_string(len) {
    var s = "";
    var chars = "abcdef0123456789";

    for( var i=0; i < len; i++ ) {
        s += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return s
}


var g_sock_map = new Map(); // (sockid, {socket:socket, games: [[gnum, color],...], username:'name'} )
var g_player_sockid_map = new Map(); // (username, sockid)
var g_seeks = []; // usernames
var g_game_map = new Map();  // (gnum, Game)
var g_gnum_sockids_map = new Map(); // (gnum, [sockid, sockid,...])




const app = express();


app.set('trust proxy', 'loopback');

const staticroot = 'static';
app.use(express.static(staticroot));

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


app.use(session( {
    secret: 'dsjgjhbcxkjh54889 mcfvb078 4w ml kjdgfs dg',
    saveUninitialized: true,
    resave:true,
    store : new FileStore(),
}))

/*
app.use( function(req, resp, next) {
    if (req.url.startsWith('/api/login')) { next(); return; }

    if ( !req.session.player || req.url.startsWith('/api/logout')) {
        req.session.regenerate( (e,d,x) => {
            resp.status(401).send('{"error" : "noauth"}');
        } )
        return;
    }
    next();
});
*/


app.get('/api/showsess', (req,res) => {
    res.send(req.session);
});

app.post('/api/login', function (req, res) {
    var username = strip(req.body.username);
    var bad_re = /[^a-zA-Z0-9 _]+/
    if ( !username ) {
        res.send({error: 'username cannot be blank'});
        return;
    }
    if ( bad_re.test(username) ) {
        res.send({error: 'only alphanumeric and underscore allowed'});
        return;
    }

    req.session.player = username;
    req.session.save();
    g_player_sockid_map.set(username, req.body.sockid); 

    res.send({message: 'success'});
    return;
})

app.post('/api/seek', (req,res) => {
    g_seeks.push(req.session.player);
    res.send({message:'added a seek'});
    // websocket send seek to update client seek list
});

app.get('/api/getSeeks', (req,res) => {
    console.log('in /api/getSeeks');
    console.log('g_seeks');
    console.log(g_seeks);
    res.send({seeks: g_seeks});
});

app.post('/api/accept', (req,res) => {
    var seeker = req.body.seeker;
    var seeker_index = g_seeks.indexOf(seeker);
    if ( seeker_index == -1 ) {
        res.send({error: 'somehow name not in list'});
        return;
    }
    g_seeks.splice(seeker_index, 1);

    var accepter = req.session.player;
    
    var black, white;
    
    if ( Math.floor(Math.random() * 2) == 1 ) {
        white = seeker;
        black = accepter;
    } else {
        black = seeker;
        white = accepter;
    }
    
    var game_num = random_string(8);
    while ( g_game_map.has(game_num) ) {
        game_num = random_string(8);
    }
    
    var game_info = {
        game_num: game_num,
        situ: 'IN PROGRESS',
        result: '', //1-0, 0-1, 1/2-1/2
        white_player: white,
        black_player: black,
        white_rating: '----',
        black_rating: '----',
        runr: 'Unrated',
        variant: 'Correspondence',
        time: 0.0,
        inc: 0,
    }


    g_game_map.set(game_num, new Game(game_info));
    var g = g_game_map.get(game_num);
    g.chess = new Chess();

    g.chess.header(
            'Event', g.time + " + " + g.inc + " " + g.runr + " " + g.variant,
            'White', g.white_player,
            'Black', g.black_player, 
            'TimeControl', g.time + '+' + g.inc,
            'WhiteElo', g.white_rating,
            'BlackElo', g.black_rating
            );

    g.startfen = g.chess.fen().split(/\s+/)[0];

    g.movetimes = [];
    g.fens = [];
                                                              
    g.current_move_index = g.chess.history().length - 1;
    g_game_map.set(game_num, g);
    
    g_gnum_sockids_map.set(game_num, []);
    /*
     //hopefully will not need this
    if ( req.session.player == white ) {
        game_info.human_color = 'w';
    } else if ( req.session.player == black ) {
        game_info.human_color = 'b';
    }
    */

    [seeker, accepter].map( p => {
        var color = p === white ? 'w' : 'b';
        var sockid = g_player_sockid_map.get(p);
        var sock_info = g_sock_map.get(sockid);
        sock_info.games.push([game_num, color]);
        sock_info.socket.emit('game_info',game_info);
        g_gnum_sockids_map.get(game_num).push(sockid);
    } )

    res.send({data: 'game accepted'});
});

app.post('/api/move', (req,res) => {
    /*
     * args: gameid, move
     * use sessid and do the move
     * return new board state or if illegal
     */
});


app.get('/txtlist', function (req, res) {
    var txtlist = [];
    fs.readdir(staticroot + '/textures', (err, files) => {
        if (files) files.forEach(file => {
            txtlist.push(file);
        });
        res.send(JSON.stringify(txtlist))
    })
})

app.get('/piecelist', function (req, res) {
    var piecelist = [];
    fs.readdir(staticroot + '/img/chesspieces', (err, files) => {
        if (files) files.forEach(file => {
            piecelist.push(file);
        });
        res.send(JSON.stringify(piecelist))
    })
})

app.get('/soundmap', function (req, res) {
    var obj = {};
    obj.ambience= [];
    obj.gong= [];
    obj.moves = [];
    obj.captures = [];
    obj.checks = [];
    fs.readdir(staticroot + '/sound/ambience', (err, files) => {
        if (files) files.forEach(file => {
            obj.ambience.push(file);
        });
        fs.readdir(staticroot + '/sound/gong', (err, files) => {
            if (files) files.forEach(file => {
                obj.gong.push(file);
            });
            fs.readdir(staticroot + '/sound/moves', (err, files) => {
                if (files) files.forEach(file => {
                    obj.moves.push(file);
                });
                fs.readdir(staticroot + '/sound/captures', (err, files) => {
                    if (files) files.forEach(file => {
                        obj.captures.push(file);
                    });
                    fs.readdir(staticroot + '/sound/checks', (err, files) => {
                        if (files) files.forEach(file => {
                            obj.checks.push(file);
                        });
                        res.send(JSON.stringify(obj))
                    })
                })
            })
        })
    })
})

var port = process.env.PORT || 3007;
const http = require('http').Server(app);

http.listen(port, function() {
    console.log('listening on port ' + port);
});


// socket.io
var io = require('socket.io')(http);

io.on('connection', function(socket) {
    g_sock_map.set(socket.id, {socket: socket, games: []});

    socket.on('message', function(msg) {
        console.log('in socket.on message');
        console.log(socket.id);
        console.log(msg);
    });

    socket.on('seek', function(msg) {
        g_seeks.push(g_sock_map.get(socket.id).username);
        //res.send({message:'added a seek'});
    });

    socket.on('get', function(msg) {
        console.log('in socket.on message');
        console.log(socket.id);
        console.log(msg);
        if (msg === 'soundmap') {



            var obj = {};
            obj.ambience= [];
            obj.gong= [];
            obj.moves = [];
            obj.captures = [];
            obj.checks = [];
            fs.readdir(staticroot + '/sound/ambience', (err, files) => {
                if (files) files.forEach(file => {
                    obj.ambience.push(file);
                });
                fs.readdir(staticroot + '/sound/gong', (err, files) => {
                    if (files) files.forEach(file => {
                        obj.gong.push(file);
                    });
                    fs.readdir(staticroot + '/sound/moves', (err, files) => {
                        if (files) files.forEach(file => {
                            obj.moves.push(file);
                        });
                        fs.readdir(staticroot + '/sound/captures', (err, files) => {
                            if (files) files.forEach(file => {
                                obj.captures.push(file);
                            });
                            fs.readdir(staticroot + '/sound/checks', (err, files) => {
                                if (files) files.forEach(file => {
                                    obj.checks.push(file);
                                });
                                //res.send(JSON.stringify(obj))
                                g_sock_map.get(socket.id).socket.emit('soundmap',obj);
                            })
                        })
                    })
                })
            })




        }
    });

    socket.on('login', function(msg) {
        console.log('in socket.on login');
        console.log(socket.id);
        console.log(msg);

        var username = strip(msg.username);
        var bad_re = /[^a-zA-Z0-9 _]+/
        if ( !username ) {
            g_sock_map.get(socket.id).socket.emit('error', 'username cannot be blank');
            return;
        }
        if ( bad_re.test(username) ) {
            g_sock_map.get(socket.id).socket.emit('error', 'only alphanumeric and underscore allowed');
            return;
        }
        
        g_sock_map.get(socket.id).username = username;
        g_player_sockid_map.set(username, socket.id); 

        g_sock_map.get(socket.id).socket.emit('login_success', username);
    });

    socket.on('move', function(msg) {
        // msg is [game.game_num, valid_move.from + '-' + valid_move.to]
        console.log('in socket.on move');
        console.log(socket.id);
        console.log(msg);
        var gnum = msg[0];
        var mv = msg[1];
        var orig = mv.split('-')[0];
        console.log('gnum');
        console.log(gnum);
        var game = g_game_map.get(gnum);
        //console.log('g_game_map');
        //console.log(g_game_map);
        //console.log('game');
        //console.log(game);
        console.log('orig');
        console.log(orig);
        console.log('game.chess.get(orig)');
        console.log(game.chess.get(orig));

        if ( game.chess.get(orig) ) {
            var piece_color = game.chess.get(orig).color;

            var gamecolors_of_socket = g_sock_map.get(socket.id).games;
            for (i=0; i<gamecolors_of_socket.length; i++) {
                var gc = gamecolors_of_socket[i];
                if (gc[0] === gnum && gc[1] === piece_color) {
                    game.chess.move(mv, {sloppy:true});
                    //go thru all the sockets that are watching or playing this game
                    g_gnum_sockids_map.get(gnum).map( sockid => {
                        g_sock_map.get(sockid).socket.emit('fen',[gnum, mv, game.chess.fen()]);
                        console.log(game.chess.fen());
                    });
                    break;
                }
            }
        }
    });
});




