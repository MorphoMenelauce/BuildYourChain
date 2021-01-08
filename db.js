#!/usr/bin/env node

const ioClient = require('socket.io-client');

// Analyse des paramètres
const argv = require('yargs')
    .option('port', {
        alias: 'p',
        default: '3000',
        description: 'port à utiliser'
    })
    .option('version', {
        description: 'Affiche la version de la db'
    })
    .help()
    .argv;

// Si l'utilisateur demande la verion
if (argv.version) {
    console.log("1.0.0");
    process.exit(0); // met fin au programme
}

// Création de la DB
const db = Object.create(null);

const neighbors = [];
const sockets = [];

function syncWhyKeys(s) {
    s.emit('keys', (keys) => {
        keys.forEach((key, i) => {
            if (!db[key]) {
                s.emit('get', key, (value) => {
                    db[key] = value;
                })
            }
        });
    });
}

// Initialisation d'une socket
function initSocket(socket) {
    socket.on('get', function (field, callback) {
        console.info(`get ${field}: ${db[field]}`);
        callback(db[field]); // lit et renvoie la valeur associée à la clef.
    });

    socket.on('set', function (field, value, timestamp, callback) {
        if (typeof timestamp === 'function') {
            // on réaffecte les valeurs aux bonnes variables
            callback = timestamp;
            timestamp = undefined;
        }
        if (field in db) { // Si la clef est dans la base de donnée
            if (db[field] != value) {
                console.info(`set error : Field ${field} exists and differ.`);
                callback(false);
            } else {
                timestamp = timestamp || Date.now();
                if (db[field].timestamp > timestamp) {
                    db[field].value = value;
                    db[field].timestamp = timestamp;
                    sockets.forEach((s, i) => {
                        s.emit('set', field, value, timestamp, (ok) => {
                        });
                    });
                }
                callback(true);
            }
        } else {
            console.info(`set ${field} : ${value}`);
            timestamp = timestamp || Date.now();
            console.log(timestamp);
            db[field] = {
                value: value,
                timestamp: timestamp
            };
            sockets.forEach((s, i) => {
                s.emit('set', field, value, timestamp, (ok) => {
                });
            });

            callback(true);
        }
    });

    socket.on('keys', function (callback) {
        console.info(`keys`);
        callback(Object.keys(db)); // Object.keys() extrait la liste des clefs d'un object et les renvoie sous forme d'un tableau.
    });

    socket.on('peers', function (callback) {
        console.info(`peers`);
        callback(neighbors); // Object.keys() extrait la liste des clefs d'un object et les renvoie sous forme d'un tableau.
    });

    socket.on('addPeer', function (port, callback) {
        console.info(`addPeer`);
        if (neighbors.includes(port)) {
            callback(false);
        } else {
            neighbors.push(port);

            const s = ioClient(`http://localhost:${port}`, {
                path: '/byc'
            });

            s.on('connect', function () {
                initSocket(s);
                sockets.push(s);
                s.emit('auth', argv.port, (ok) => {
                    console.info('auth:', ok);
                });
                syncWhyKeys(s);
            })

            callback(true);
        }
    });

    socket.on('auth', function (port, callback) {
        console.info(`auth`, port);
        if (neighbors.includes(port)) {
            console.info('Le port est déjà dans la liste', port);
            callback(false);
        } else {
            console.info('Le port ajouté avec success', port);
            neighbors.push(port);
            sockets.push(socket);
            callback(true);
            syncWhyKeys(socket);
        }
    });
}

// Création du serveur
const io = require('socket.io')(argv.port, {
    path: '/byc',
    serveClient: false,
});

console.info(`Serveur lancé sur le port ${argv.port}.`);

// À chaque nouvelle connexion
io.on('connect', (socket) => {
    console.info('Nouvelle connexion');
    initSocket(socket);
});
