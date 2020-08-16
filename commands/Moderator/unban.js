const Command = require('../../base/Command.js');

class unban extends Command {
  constructor (client) {
    super(client, {
      name: 'unban',
      description: 'Unban a member',
      usage: 'unban',
      category: 'Moderator',
      guildOnly: true,
    });
  }

  async run (msg, args) {

  }
}

module.exports = unban;
