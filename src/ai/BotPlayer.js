"use strict";
var PlayerTracker = require('../PlayerTracker');
var Vec2 = require('../modules/Vec2');
var WebSocket = require('ws');
var util = require('util');

var idCounter = 0;

function BotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));
    this.id = ++idCounter;
    console.log("New BotPlayer: id = " + this.id);
}
module.exports = BotPlayer;
BotPlayer.prototype = new PlayerTracker();


BotPlayer.prototype.largest = function (list) {
    // Sort the cells by Array.sort() function to avoid errors
    var sorted = list.valueOf();
    sorted.sort(function (a, b) {
        return b._size - a._size;
    });
    return sorted[0];
};

BotPlayer.prototype.joinGame = function () {
    console.log("Spawning bot " + this.id);
    this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
};

BotPlayer.prototype.checkConnection = function () {
    PlayerTracker.prototype.checkConnection.call(this);

    if (!this.cells.length) {
        console.log("Bot " + this.id + " has died");
        this.socket.close(1000, "Bot died");
    }
};

BotPlayer.prototype.sendUpdate = function () {
    console.log("Trying to send update for bot " + this.id);
    var ownCell = this.largest(this.cells);

    if (!ownCell) return; // Cell was eaten, check in the next tick (I'm too lazy)

    console.log("Sending update for bot " + this.id);

    var nodesToSend = [];
    for (var node of this.viewNodes) {
        if (node.owner == this) continue;

        nodesToSend.push({
            cellType: node.cellType,
            size: node._size,
            position: node.position.clone().sub(ownCell.position)
        });
    }

    var scoreToSend = {
        score: this._score
    };

    //console.log("Sending world: " + util.inspect(nodesToSend));
    //console.log("Sending score: " + util.inspect(scoreToSend));
    this.socket.packetHandler.sendPlaintext(JSON.stringify(nodesToSend));
    this.socket.packetHandler.sendPlaintext(JSON.stringify(scoreToSend));
};

BotPlayer.prototype.handleReceivedAction = function (action) {
    console.log("Received action for bot " + this.id);
    var ownCell = this.largest(this.cells);
    console.log("Bot " + this.id + " has " + this.cells.length + " cells");
    if (!ownCell)
        // The server has managed to send an update,
        // but the cell has died before the client has replied with an action.
        // Ignore the action.
        return;

    var directionInRad = action.direction * Math.PI / 180;
    var displacement = new Vec2(
        Math.cos(directionInRad),
        Math.sin(directionInRad));

    this.mouse = ownCell.position.clone()
        .add(displacement, 800);
};
