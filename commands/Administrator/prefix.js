const Command = require('../../base/Command.js');

class Exec extends Command {
  constructor (client) {
    super(client, {
      name: 'prefix',
      description: 'View or change the guild prefix',
      category: 'Administrator',
      usage: 'prefix [different prefix]',
      aliases: ['p'],
      permLevel: 'Administrator'
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    
  }
}

module.exports = Exec;
