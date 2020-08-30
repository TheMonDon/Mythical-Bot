const Command = require('../../base/Command.js');

class setup extends Command {
  constructor (client) {
    super(client, {
      name: 'setup',
      description: 'Setup the different systens of the bot.',
      usage: 'setup',
      category: 'General',
      guildOnly: true
    });
  }

  async run (msg, text) { // eslint-disable-line no-unused-vars
    const server = msg.guild;
    const me = msg.guild.me;
    const p = msg.settings.prefix;

    return msg.channel.send('This command is not setuo yet..haha.')
  }
}

module.exports = setup;
