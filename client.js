const m = require('mithril')
//const m = mithril();
sock = io();
var root = document.body;


var default_themes = [
    {"name":"cop","light_rgba":{"r":255,"g":255,"b":255,"a":0.09},"dark_rgba":{"r":255,"g":255,"b":255,"a":0},"texture":"brushed-copper.jpg","white_pieces":"alpha","black_pieces":"alpha"},
    {"name":"fire","dark_rgba":{"r":0,"g":0,"b":0,"a":0.74},"light_rgba":{"r":253.57,"g":132.59,"b":33.14,"a":0.72},"texture":"Fire-Flames-Background-11-625x468.jpg","white_pieces":"chesscom","black_pieces":"chesscom"},
    {"name":"hunjies","dark_rgba":{"r":48.43,"g":101.82,"b":21.71,"a":0.81},"light_rgba":{"r":245.46,"g":244.67,"b":241.70,"a":0.79},"texture":"Money-Background-17-625x625.jpg","white_pieces":"uscf","black_pieces":"uscf"},
    {"name":"leaves","dark_rgba":{"r":0,"g":0,"b":0,"a":0.71},"light_rgba":{"r":255,"g":255,"b":255,"a":0.56},"texture":"Nature-Leaves-Background-70-625x500.jpg","white_pieces":"chesscom","black_pieces":"chess24"},
    {"name":"medieval","dark_rgba":{"r":0,"g":0,"b":0,"a":0.55},"light_rgba":{"r":243.98,"g":228.07,"b":195.99,"a":0.64},"texture":"kentmap.jpg","white_pieces":"leipzig","black_pieces":"leipzig"},
    {"name":"metal","dark_rgba":{"r":0,"g":0,"b":0,"a":0},"light_rgba":{"r":226.63,"g":250.002,"b":54.77,"a":0.46},"texture":"metal-plate-texture_1048-2443.jpg","white_pieces":"chesscom_wood","black_pieces":"chesscom"},
    {"name":"royal","dark_rgba":{"r":116.17,"g":38.98,"b":255,"a":0.71},"light_rgba":{"r":242.47,"g":205.57,"b":65.49,"a":0.55},"texture":"Money-Background-19-625x468.jpg","white_pieces":"wikipedia","black_pieces":"alpha"},
    {"name":"stone","dark_rgba":{"r":145.60,"g":2.82,"b":2.82,"a":0.372},"light_rgba":{"r":255,"g":200.7105,"b":200.7105,"a":0.47},"texture":"Stone-Tiles-Background-22-625x625.jpg","white_pieces":"symbol","black_pieces":"chess24"},
    {"name":"warroom","dark_rgba":{"r":0,"g":0,"b":0,"a":0.6},"light_rgba":{"r":46.42,"g":254.39,"b":0,"a":0.63},"texture":"design_digital_map3.jpg","white_pieces":"chesscom","black_pieces":"chess24"},
    {"name":"wawa","dark_rgba":{"r":2.847,"g":0,"b":255,"a":0.43},"light_rgba":{"r":239.01,"g":235.93,"b":224.24,"a":0.07},"texture":"blue-rippled-water-background-in-swimming-pool_1373-193.jpg","white_pieces":"uscf","black_pieces":"chess24"},
    {"name":"wood","dark_rgba":{"r":91.31,"g":28.09,"b":28.09,"a":0.75},"light_rgba":{"r":176.12,"g":238.45,"b":103.1,"a":0.2},"texture":"antique-wooden-planks-texture_1232-824.jpg","white_pieces":"chesscom","black_pieces":"alpha"}]


var soundmap = {
    ambience: [],
    gong: [],
    moves: [],
    captures: [],
    checks: []
};


function loadThemes() {
    var themes = Cookies.get('themes');
    if (!themes) {
        themes = default_themes;
        Cookies.set('themes', JSON.stringify(themes), {expires: 30000});
    }
}

loadThemes();

function highlightSquares(board_div, color, move=null, clear=false) {
    board_div.find('.square-55d63').removeClass('highlight-square-'+color);
    if (move && !clear) {
        board_div.find('.square-' + move.to).addClass('highlight-square-'+color);
        board_div.find('.square-' + move.from).addClass('highlight-square-'+color);
    }
}


sock.on('error', function(msg) {
    console.log('in sock on error!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log(msg);
});

sock.on('game_info', function(msg) {
    console.log('in sock on game_info');
    console.log(msg);
    Boards.addGame(msg);
    m.route.set('/boards');
});

sock.on('move_info', function(msg) {
    console.log('in sock on move_info');
    console.log(msg);

    var game_num = msg[0];
    var game = Boards.games.get(game_num);
    var mv = msg[1];

    console.log(game);
    if (game.chess) { 
        var move_info = game.chess.move(mv, {sloppy:true});
        console.log('move_info');
        console.log(move_info);
        if (move_info) {
            var howmany = Math.ceil(Math.random() * 2);
            for (i=1; i<=howmany; i++) {
                if (game.chess.in_check()) {
                    soundmap.checks[Math.floor(Math.random() * soundmap.checks.length)].play();
                    soundmap.checks[Math.floor(Math.random() * soundmap.checks.length)].play();
                } else if (['n','b','k','q','p'].includes(move_info.flags)) {
                    soundmap.moves[Math.floor(Math.random() * soundmap.moves.length)].play();
                    soundmap.moves[Math.floor(Math.random() * soundmap.moves.length)].play();
                } else {
                    soundmap.captures[Math.floor(Math.random() * soundmap.captures.length)].play();
                    soundmap.captures[Math.floor(Math.random() * soundmap.captures.length)].play();
                }
            }

            /*
            if (['1-0','0-1','1/2-1/2'].indexOf(game.result) === -1) {
                runClock(game_num);
            }
            */

            var new_move_index = game.chess.history().length - 1;
        
            //game.movetimes[new_move_index] = ficsobj.s12.move_time;
            game.fens[new_move_index] = game.chess.fen().split(/\s+/)[0];
            //appendToMoveList(game_num, new_move_index);


            //var whose_move = ['w','b'][new_move_index % 2];

            var my_color = Boards.getMyColor(game_num);
            var whose_move = game.chess.fen().split(/\s+/)[1];

            var my_turn = whose_move === my_color;
            console.log('here')
            if (!my_turn && !game.premove) { console.log('here2'); Boards.goToMove(game_num, new_move_index, animate=false) }
            else { console.log('here3'); Boards.goToMove(game_num, new_move_index, animate=true); }
        }

        /*
        if (ficsobj.s12.my_rel === '1' && game.premove) {
            var source = game.premove.from;
            var target = game.premove.to;
            var piece = game.premove.piece;
            var mv = { from: source, to: target };

            if (/[18]$/.test(target) && /[pP]/.test(piece)) {
                var choices = game.chess.moves({verbose:true});
                for (var i=0; i<choices.length; i++) {
                    m = choices[i];
                    if (m.from === source && m.to === target) {
                        mv.promotion = 'q';
                        break;
                    }
                }
            }

            highlightSquares($('#board_'+game_num), 'red', clear=true);
            game.premove = null;

            var valid_move = game.chess.move(mv);
            if (valid_move) {
                game.chess.undo();
                ficswrap.emit('command',valid_move.san);
            }
        }
        */
    }
});

sock.on('soundmap', function(msg) {
    var result = msg;
    for (i=0; i<result.ambience.length; i++) {
        soundmap.ambience.push( new Howl({ src: ['/sound/ambience/' + result.ambience[i]] }) );
    }
    for (i=0; i<result.gong.length; i++) {
        soundmap.gong.push( new Howl({ src: ['/sound/gong/' + result.gong[i]] }) );
    }
    for (i=0; i<result.moves.length; i++) {
        soundmap.moves.push( new Howl({ src: ['/sound/moves/' + result.moves[i]] }) );
    }
    for (i=0; i<result.captures.length; i++) {
        soundmap.captures.push( new Howl({ src: ['/sound/captures/' + result.captures[i]] }) );
    }
    for (i=0; i<result.checks.length; i++) {
        soundmap.checks.push( new Howl({ src: ['/sound/checks/' + result.checks[i]] }) );
    }
})

sock.on('login_success', function(msg) {
    console.log('in sock on login_success');
    console.log(msg);

    Cookies.set('username', msg, {expires: 30000});

    sock.emit('get','soundmap');

    m.route.set('/mainmenu');
});

sock.on('seek_list', function(msg) {
    console.log('in sock.on seek_list');
    console.log(msg);
    SeekList.seeks = msg;
    m.redraw()
});

var MainMenu = {
    view : function(vnode) {
        return m('ul', [
            m('li' , m('button', {
                            onclick: (e) => {
                                sock.emit('message','nutbagholee');
                                sock.emit('seek', 'standard blitz or whatever');
                                return false;
                            }
                        },
                        'seek game')),
            m('li' , m('button', {onclick: (e) => m.route.set('/seeklist')}, 'see seeks')),
            m('li' , m('button', 'games')),
            m('li' , m('button', 'players')),
        ]);
    }
    
}


var SeekList = {
	seeks: [],
    onupdate: function(vnode) {
        console.log('in SeekList onupdate');
        console.log(SeekList.seeks);
        //sock.emit('get', 'seeks');
    },

    oninit : function (vnode) {
        console.log('in SeekList oninit');
        console.log(SeekList.seeks);
        sock.emit('get', 'seeks');
    },

    view : function(vnode) {
        return m('ul', SeekList.seeks.map( seeker => {
                return m('li' , m('a', {
                            onclick: (e) => {
                                sock.emit('accept',seeker);
                                return false;
                            }
                        },
                            seeker))
                        }));
    }
}



var Boards = {
    games: new Map(),

    need_js_board: [],

    addGame: function(ginfo) {
        Boards.games.set(ginfo.game_num, new Game(ginfo));

        var g = Boards.games.get(ginfo.game_num);
        themes = Cookies.get('themes');
        if (themes) { themes = JSON.parse(themes) };
        
        g.theme = themes[Math.floor(Math.random() * themes.length)];

        if (Cookies.get('username') === g.black_player) {
            g.top_is_black = 0;
        } else if (Cookies.get('username') === g.white_player) {
            g.top_is_black = 1;
        } else {
            g.top_is_black = Math.floor(Math.random() * 2);
        }

        Boards.need_js_board.push(ginfo.game_num);
    },

    goToMove: function(game_num, i, animate=false) {
        var game = Boards.games.get(game_num);
        //$('.move_'+game_num).removeClass('highlight');
        game.current_move_index = i;
        if (i == -1) {
            game.board.position(game.startfen, animate);
        } else {
            if (game.empty_square) { // piece is hovering
                game.board.position(game.fens[i], animate);
                var pos = game.board.position();
                var piece_there_now = pos[game.empty_square];
                if (piece_there_now === game.empty_piece) {
                    delete pos[game.empty_square];
                    game.board.position(pos, false);
                } else {
                    game.empty_square = null;
                    game.empty_piece = null;
                }
            } else {
                game.board.position(game.fens[i], animate);
            }

            var mv = game.chess.history({verbose: true})[i];
            var board_div = $('#board_'+game_num);

            highlightSquares($('#board_'+game_num), 'yellow', move=mv);

            //$('#move_' + game_num + '_' + i).addClass('highlight');;
        }
        /*
        if (i == game.chess.history().length -1) {
            $('#moves_'+game_num).scrollTop($('#moves_'+game_num).prop('scrollHeight'));
        }
        */
    },

	oninit : function(vnode) {
	},
    highlightSquares: function(board_div, color, move=null, clear=false) {
        board_div.find('.square-55d63').removeClass('highlight-square-'+color);
        if (move && !clear) {
            board_div.find('.square-' + move.to).addClass('highlight-square-'+color);
            board_div.find('.square-' + move.from).addClass('highlight-square-'+color);
        }
    },


    getMyColor: function(gnum) {
        var g = Boards.games.get(gnum);
        var my_name = Cookies.get('username');

        if ( [g.white_player, g.black_player].includes(my_name) ) {
            return g.white_player === my_name ? 'w' : 'b';
        } else {
            return 'x';
        }
    },

    makeJSBoards: function() {
        Array.from(Boards.games.keys()).map( gnum => {
            var game = Boards.games.get(gnum);
            console.log('WHOLE NEW CHESSBOARD JS BEING MADE');
            game.board = new ChessBoard('board_' + gnum, {
                pieceTheme: game.pieceTheme,
                position: game.chess.fen().split(/\s+/)[0],
                draggable:true,

                onDragStart : function(source, piece, pos, orientation) {
                    var my_color = Boards.getMyColor(gnum);
                    var whose_move = game.chess.fen().split(/\s+/)[1];

                    if (piece[0] === my_color) {
                        var my_turn = whose_move === my_color;
                        if ( !my_turn ) {
                            game.empty_square = source;
                            game.empty_piece = piece;
                        }
                        return true;
                    }
                    return false;
                },
                onDrop : function(source, target, piece, newPos, oldPos, orientation) {
                    if (target === game.empty_square) {
                        var pos = game.board.position();

                        if (!pos[game.empty_square]) {
                            pos[game.empty_square] = game.empty_piece;
                            game.board.position(pos);
                        }

                        game.empty_square = null;
                        game.empty_piece = null;


                    } else {
                        var mv = { from: source, to: target };
                        if (/[18]$/.test(target) && /[pP]/.test(piece)) {
                            var choices = game.chess.moves({verbose:true});
                            for (var i=0; i<choices.length; i++) {
                                var mo = choices[i];
                                if (mo.from === source && mo.to === target) {
                                    mv.promotion = 'q';
                                    break;
                                }
                            }
                        }
                        var valid_move = game.chess.move(mv);
                        if (valid_move) {
                            game.chess.undo();
                        }
                        var whose_move = game.chess.fen().split(/\s+/)[1];
                        var my_color = Boards.getMyColor(gnum);
                        var my_turn = whose_move === my_color;
                        if ( my_turn ) {
                            if (!valid_move) {
                                if (game.empty_square) {
                                    var pos = game.board.position();

                                    if (!pos[game.empty_square]) {
                                        pos[game.empty_square] = game.empty_piece;
                                        game.board.position(pos, false);
                                    }

                                    game.empty_square = null;
                                    game.empty_piece = null;
                                }
                                return 'snapback';
                            } else {
                                sock.emit('move', [gnum, valid_move.from + '-' + valid_move.to]);
                            }
                        } else if ( !my_turn ) {
                            var mv = {}
                            if (source != target) {
                                if (target === 'offboard') {
                                    if (game.premove) {
                                        if (game.premove.from === source) {
                                            game.premove = null;
                                            highlightSquares($('#board_'+gnum), 'red', clear=true);
                                        }
                                    } else { 
                                        //do nothing
                                    }
                                } else {
                                    mv.from = source;
                                    mv.to = target;
                                    mv.piece = piece;
                                    game.premove = mv;
                                    highlightSquares($('#board_'+gnum), 'red', clear=true);
                                    highlightSquares($('#board_'+gnum), 'red', move=mv);

                                    if (game.empty_square) {
                                        var pos = game.board.position();

                                        if (!pos[game.empty_square]) {
                                            pos[game.empty_square] = game.empty_piece;
                                            game.board.position(pos, false);
                                        }

                                        game.empty_square = null;
                                        game.empty_piece = null;
                                    }
                                }
                            }

                            return 'snapback'
                        }
                    }
                },




                },
            );

            if (!game.top_is_black) {
                game.board.flip();
            }
            $('#board_'+gnum).find('.white-1e1d7').css('background-color', tinycolor(game.theme.light_rgba));
            $('#board_'+gnum).find('.white-1e1d7').css('color', tinycolor(game.theme.dark_rgba));
            $('#board_'+gnum).find('.black-3c85d').css('background-color', tinycolor(game.theme.dark_rgba));
            $('#board_'+gnum).find('.black-3c85d').css('color', tinycolor(game.theme.light_rgba));

            $('#board_'+gnum).find('.board-b72b1').css('background-image', game.theme.texture ? 'url(/textures/' + game.theme.texture + ')' : 'none');
            $('#board_'+gnum).find('.board-b72b1').css('background-repeat', 'no-repeat');
            $('#board_'+gnum).find('.board-b72b1').css('background-position', 'center');
            $('#board_'+gnum).find('.board-b72b1').css('background-size', 'cover');
        })
    },

    onupdate: function(vnode) {
        console.log('in Boards onupdate');
        Boards.makeJSBoards();


    },

    oncreate: function(vnode) {
        console.log('in Boards oncreate');
        Boards.makeJSBoards();


    },

    view: function(vnode) {
        return m("div", {"class":"clearfix","id":"games_div"}, 
                    Array.from(Boards.games.values(), g => {
                        return m("div", {"class":"clearfix observe","id":"observe_"+g.game_num},
                            [
                                m("div", {"class":"player_name","id":"top_player_"+g.game_num}, 
                                    g.top_is_black ? g.black_player : g.white_player
                                    //"emCkew (1370)"
                                ),
                                m("div", {"class":"board_info_container"}, 
                                    m("div", {"class":"board","id":"board_"+g.game_num}, 
                                    )
                                ),
                                m("div", {"class":"player_name","id":"bottom_player_"+g.game_num}, 
                                    g.top_is_black ? g.white_player : g.black_player
                                    //"zigamo (1348)"
                                )
                            ]
                        )
                    })
        );
    }
}

var Login = {
    username : '',
    view : function(vnode) {
        return m( 'table', [ 
           m('tr', [
               m('td', 'Uuuusername:'),
               m('td', m('input', {type: 'text', size: '12', value: Login.username, oninput: (e) => Login.username = e.target.value})
                   ), 
           ]),
           m('tr', [
               m('td', {colspan: 2, align: 'center'}, 
                   m('button',  {onclick: (e) => {
                           sock.emit('login', {username: Login.username, password: ''});
                           return false;
                       }
                   }, 'login')
                ), 
           ]),
       ]);
    }
}




var PlayerList = {
    // show list o players
}

var GameList = {
    // show a game list
}


m.route(root, "/login", {
    "/login": Login,
    "/mainmenu": MainMenu,
    "/seeklist": SeekList,
    "/boards": Boards,
})



