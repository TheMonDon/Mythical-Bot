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
    const friendly = this.client.config.permLevels.find(l => l.level === level).name;
    msg.reply(`Your permission level is: ${level} - ${friendly}`);
  }
}

module.exports = MyLevel;
