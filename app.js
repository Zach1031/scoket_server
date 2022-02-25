var app = require('express')();
var hbs = require('hbs');
var session = require('express-session');
var path = require('path');

var http = require('http').Server(app);
var io = require('socket.io')(http);

var { v4: uuidv4 } = require('uuid');

app.set('view engine', 'hbs');

app.get('/', function(req, res){
    res.render('index');
});

app.get('/:room_id', function(req, res){
    var room = (findRoom(req.params.room_id))[0];
    console.log('here');

    if(room){
        console.log('here');
        res.render('index', {connection: room.id});
    }

    else{
        res.render('index', {error: "The Room ID You Entered Was Not Correct"});
    }
});

var clients = 0;
var rooms = [
];
function findRoom(id) {
    return rooms.filter(
        function(room){ return room.id == id }
    );
}

function generateRoomId(){
    var id = uuidv4();
    return id.substring(0,7);
    //return room_ids[Math.floor(Math.random() * room_ids.length)];
}

//Ideally, there would be some priority for matchmaking, likely based on distance or ping but idk how to do that
//For now it is just the first avaliable room
function findBestRoom(room_list){
    if(room_list = []){return null};
    return room_list[0];
}

function findWaiting(){
    for(i = 0; i < rooms.length; i++){
        if(rooms[i].users.length == 1 && rooms[i].public){
            return {pos: i, room: rooms[i]};
        }
    }

    return null;
}

io.on('connection', function(socket){
    clients++;
    console.log(clients, " clients on the server");

    socket.on('connectToRoom', function(data){
        var room = (findRoom(data.id))[0];
        console.log(room);
        if(room){
            console.log(room);
            console.log(room.users);
            console.log('in');
            if(room.users.length == 2){
                socket.emit('fullRoom', {message: "Sorry, the room you are trying to enter is currently full"});
            }

            else if(room.users.length == 1){
                socket.join(room.id);
                io.sockets.in(room.id).emit('startMatch', {users: [data.user_name, room.users[0]]});
            }
            
        }

        else{
            socket.emit('unsuccessfulRoomConnection', {description: "The room you entered was not correct"})
        }
    });

    socket.on('createRoom', function(data){
        var room_id = generateRoomId();
        rooms.push({id: room_id, users: [data.user_name], public: false});
        console.log(rooms);
        socket.join(room_id);
        socket.emit('waitingRoom', {id: room_id});
    }); 

    socket.on('joinRandom', function(data){
        var room = findWaiting();
        if(room){
            var pos = room.pos;
            //This is horrible lol
            rooms[pos] = {id: room.room.id, users: room.room.users.push(data.user_name)};
            socket.join(room.room.id);
            io.sockets.in(room.room.id).emit('startMatch', {users: [data.user_name, room.room.users[0]]});
            console.log(room);
        }

        else{
            var room_id = generateRoomId();
            rooms.push({id: room_id, users: [data.user_name], public: true});
            console.log(rooms);
            socket.join(room_id);
            socket.emit('waitingRoom');
        }
    })



    io.sockets.in('room-1').emit('New room', {description: 'A new person has entered the room!'});


    socket.on('disconnect', function(){clients--;})
});

http.listen(3000, function(){
   console.log('listening on *:3000');
});