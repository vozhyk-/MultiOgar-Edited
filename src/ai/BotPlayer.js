"use strict";
var PlayerTracker = require('../PlayerTracker');
var Vec2 = require('../modules/Vec2');
var WebSocket = require('ws');
var util = require('util');

function BotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));
    this.splitCooldown = 0;
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
    this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
};

BotPlayer.prototype.checkConnection = function () {
    PlayerTracker.prototype.checkConnection.call(this);

    if (!this.cells.length)
        this.socket.close(1000, "Bot died");
};

BotPlayer.prototype.sendUpdate = function () {
    var ownCell = this.largest(this.cells);

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
    this.socket.packetHandler.sendPlaintext(JSON.stringify(nodesToSend));
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
