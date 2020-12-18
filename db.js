#!/usr/bin/env node

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

// Initialisation d'une socket
function initSocket(socket) {
    socket.on('get', function (field, callback) {
        console.info(`get ${field}: ${db[field]}`);
        callback(db[field]); // lit et renvoie la valeur associée à la clef.
    });

    socket.on('set', function (field, value, callback) {
        if (field in db) { // Si la clef est dans la base de donnée
            console.info(`set error : Field ${field} exists.`);
            callback(true);
        } else {
            console.info(`set ${field} : ${value}`);
            db[field] = value;
            callback(true);
        }
    });

    socket.on('keys', function (callback) {
        console.info(`keys`);
        callback(Object.keys(db)); // Object.keys() extrait la liste des clefs d'un object et les renvoie sous forme d'un tableau.
    });
}

// Création du serveur
const io = require('socket.io')(argv.port, {
    path: '/byc',
    serveClient: false,
});

console.info(`Serveur lancé sur le port ${argv.port}.`);

// Création de la DB
const db = Object.create(null);

// À chaque nouvelle connexion
io.on('connect', (socket) => {
    console.info('Nouvelle connexion');
    initSocket(socket);
});
