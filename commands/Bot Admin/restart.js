const Command = require('../../base/Command.js');

class restart extends Command {
  constructor (client) {
    super(client, {
      name: 'restart',
      description: 'Restarts the bot.',
      usage: 'restart',
      category: 'Bot Admin'
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars

    return msg.channel.send('This command is not functional yet.');

  }
}

module.exports = restart;
