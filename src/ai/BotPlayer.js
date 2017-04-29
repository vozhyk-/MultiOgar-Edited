var PlayerTracker = require('../PlayerTracker');
var Vec2 = require('../modules/Vec2');
var WebSocket = require('ws');
var util = require('util');

function BotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));
    this.splitCooldown = 0;

    this.connectToController();
}
module.exports = BotPlayer;
BotPlayer.prototype = new PlayerTracker();


BotPlayer.prototype.connectToController = function () {
    this.controllerSocket = new WebSocket('ws://localhost:60124');

    var connected = this.controllerConnected = { t: false };
    this.controllerSocket.on('open', function() {
        console.log('Connected to the controller!');
        connected.t = true;
    });
    this.controllerSocket.on('error', function(error) {
        console.log('Controller socket error: %s', error);
        throw error;
    });

    var botPlayer = this;
    this.controllerSocket.on('message', function(message) {
        console.log('Received:' + message);
        botPlayer.handleReceivedAction(JSON.parse(message));
    });
};

BotPlayer.prototype.largest = function (list) {
    // Sort the cells by Array.sort() function to avoid errors
    var sorted = list.valueOf();
    sorted.sort(function (a, b) {
        return b._size - a._size;
    });
    return sorted[0];
};

BotPlayer.prototype.checkConnection = function () {
    if (this.socket.isCloseRequest) {
        while (this.cells.length) {
            this.gameServer.removeNode(this.cells[0]);
        }
        this.isRemoved = true;
        return;
    }
    // Respawn if bot is dead
    if (!this.cells.length)
        this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
};

BotPlayer.prototype.sendUpdate = function () {
    if (this.splitCooldown) this.splitCooldown--;
    this.decide(this.largest(this.cells)); // Action
};

// Custom
BotPlayer.prototype.decide = function (ownCell) {
    if (!this.controllerConnected.t) {
        console.log("Controller isn't connected yet...");
        return;
    }

    if (!ownCell) return; // Cell was eaten, check in the next tick (I'm too lazy)

    var nodesToSend = [];
    for (var node of this.viewNodes) {
        if (node.owner == this) continue;

        nodesToSend.push({
            cellType: node.cellType,
            size: node._size,
            position: node.position.clone().sub(ownCell.position)
        });
    }

    console.log("Sending: " + util.inspect(nodesToSend));
    this.controllerSocket.send(JSON.stringify(nodesToSend));
};

BotPlayer.prototype.handleReceivedAction = function (action) {
    var directionInRad = action.direction * Math.PI / 180;
    var displacement = new Vec2(
        Math.cos(directionInRad),
        Math.sin(directionInRad));

    var ownCell = this.largest(this.cells);
    this.mouse = ownCell.position.clone()
        .add(displacement, 800);
};
