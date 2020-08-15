const Command = require('../../base/Command.js');

class Reboot extends Command {
  constructor (client) {
    super(client, {
      name: 'reboot',
      description: 'Restarts the bot',
      category: 'Owner',
      usage: 'reboot',
      permLevel: 'Bot Owner',
    });
  }

  async run (message, args, level) { // eslint-disable-line no-unused-vars
    try {
      await message.reply('Bot is restarting down.');
      await Promise.all(this.client.commands.map(cmd => this.client.unloadCommand(cmd)));
      process.exit(0);
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Reboot;
