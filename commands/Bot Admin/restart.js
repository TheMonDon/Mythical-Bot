const Command = require('../../base/Command.js');	

class Restart extends Command {	
  constructor (client) {	
    super(client, {	
      name: 'restart',	
      description: 'Restarts the bot',	
      category: 'Bot Admin',	
      usage: 'restart',	
      permLevel: 'Bot Admin',
      aliases: ['reboot']
    });	
  }	

  async run (message, args, level) { // eslint-disable-line no-unused-vars	
    try {	
      await message.reply('Bot is restarting.');	
      await Promise.all(this.client.commands.map(cmd => this.client.unloadCommand(cmd)));	
      process.exit(0);	
    } catch (e) {	
      console.log(e);	
    }	
  }	
}	

module.exports = Restart;