#!/usr/bin/env node

const argv = require('yargs') // Analyse des paramètres
    .command('get <key>', 'Récupère la valeur associé à la clé')
    .command('set <key> <value>', 'Place une association clé / valeur')
    .command('keys', 'Demande la liste des clés')
    .command('addPeer <peerPort>', 'Ajoute un nouveau noeud voisin')
    .command('peers', 'Demande la liste des pairs du noeud')
    .command('version', 'Demande la version du CLI')
    .option('url', {
        alias: 'u',
        default: 'http://localhost',
        description: 'Url du serveur à contacter'
    })
    .option('port', {
        alias: 'p',
        default: '3000',
        description: 'port à utiliser'
    })
    .option('bot', {
        alias: 'b',
        default: false,
        description: 'désactive les messages utilisateur'
    })
    .demandCommand(1, 'Vous devez indiquer une commande')
    .help()
    .argv;

// Si l'utilisateur demande la verion
if (argv._[0] == "version") {
    console.log("1.0.0");
    process.exit(0); // met fin au programme
}

const io = require('socket.io-client');

const socket = io(`${argv.url}:${argv.port}`, {
    path: '/byc',
    timeout: 5000,
    reconnection: false,
    requestTimeout: 5000
});

socket.on('error', (error) => {
    console.error('error:', error);
    socket.close();
});

socket.on('reconnect', (error) => {
    console.error('reconnect:', error);
    socket.close();
});

socket.on('reconnect_attempt', (error) => {
    console.error('reconnect:', error);
    socket.close();
});

socket.on('reconnect_error', (error) => {
    console.error('reconnect:', error);
    socket.close();
});

socket.on('reconnect_failed', (error) => {
    console.error('reconnect:', error);
    socket.close();
});

socket.on('connect_error', (error) => {
    console.error('connect_error:', error);
    socket.close();
});

socket.on('disconnect', () => {
    if (!argv.bot) {
        console.info('Disconnect');
    }
});

socket.on('connect', () => {
    if (!argv.bot) {
        console.info('Connection établie');
    }

    let id;

    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        new Promise((resolve, reject) => {
            id = setTimeout(() => {
                clearTimeout(id);
                socket.close();
                reject('Le serveur ne répond pas');
                if (!argv.bot) {
                    console.info(`Le serveur ne répond pas...`);
                }
            }, 5000)
        }),
        ,
        new Promise((resolve, reject) => {
            function end() {
                socket.close();
                resolve();
                clearTimeout(id);
            }

            switch (argv._[0]) {
                case 'get':
                    if (!argv.bot) {
                        console.info(`Commande get ${argv.key} =>`);
                    }
                    socket.emit('get', argv.key, (value) => {
                        console.info(value);
                        end();
                    });
                    break;
                case 'set':
                    if (!argv.bot) {
                        console.info(`set ${argv.key} =>`);
                    }
                    socket.emit('set', argv.key, argv.value, (ok) => {
                        console.info(ok);
                        end();
                    });
                    break;
                case 'keys':
                    if (!argv.bot) {
                        console.info(`keys =>`);
                    }
                    socket.emit('keys', (keys) => {
                        console.info(keys.join(','));
                        end();
                    });
                    break;
                case 'addPeer':
                    if (!argv.bot) {
                        console.info(`addPeer ${argv.peerPort} =>`);
                    }
                    socket.emit('addPeer', argv.peerPort, (ok) => {
                        console.info(ok);
                        end();
                    });
                    break;
                case 'peers':
                    if (!argv.bot) {
                        console.info(`peers =>`);
                    }
                    socket.emit('peers', (peers) => {
                        console.info(peers.join(','));
                        end();
                    });
                    break;
                default:
                    console.error("Commande inconnue");
                    end();
            }
        }),
    ])
});
