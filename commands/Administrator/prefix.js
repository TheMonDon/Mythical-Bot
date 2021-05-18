const Command = require('../../base/Command.js');

class prefix extends Command {
  constructor (client) {
    super(client, {
      name: 'prefix',
      description: 'View or change the guild prefix.',
      category: 'Administrator',
      usage: 'prefix [New Prefix]',
      aliases: ['p'],
      permLevel: 'Administrator'
    });
  }

  async run (msg, args) {
    const prefix = msg.settings.prefix;
    if (!args || args.length < 1) return msg.channel.send(`The current prefix is: \`${prefix}\``);
    const newprefix = args.join(' ');

    if (newprefix.length > 15) return msg.channel.send('The length of the prefix must be less than 15 characters.');

    if (newprefix === prefix) return msg.channel.send(`The prefix is already set to ${prefix}`);

    this.client.settings.set(msg.guild.id, newprefix, 'prefix');
    msg.channel.send(`The prefix has been changed to: ${newprefix}`);
  }
}

module.exports = prefix;
