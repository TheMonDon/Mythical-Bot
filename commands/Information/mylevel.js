const Command = require('../../base/Command.js');

class MyLevel extends Command {
  constructor (client) {
    super(client, {
      name: 'mylevel',
      description: 'Displays your permission level',
      usage: 'mylevel',
      category: 'Information',
      aliases: ['level', 'lvl', 'mylvl'],
      guildOnly: true
    });
  }

  async run (msg, _args, level) {
    // Change the level number to a friendly name
    const friendly = this.client.config.permLevels.find(l => l.level === level).name;
    return msg.reply(`Your permission level is: ${level} - ${friendly}`);
  }
}

module.exports = MyLevel;
