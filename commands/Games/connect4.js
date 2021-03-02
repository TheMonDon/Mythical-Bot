const Command = require('../../base/Command.js');

class connect4 extends Command {
  constructor (client) {
    super(client, {
      name: 'connect4',
      description: 'Play a game of connect4.',
      usage: 'connect4 <member to play with>',
      category: 'Games'
    });
  }

  async run (msg, args) {
    return msg.channel.send('This is not done.');
  }
}
module.exports = connect4;
