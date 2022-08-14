const Command = require('../../base/Command.js');

class Prefix extends Command {
  constructor (client) {
    super(client, {
      name: 'prefix',
      description: 'View or change the guild prefix.',
      category: 'Administrator',
      usage: 'Prefix [New Prefix]',
      aliases: ['p'],
      permLevel: 'Administrator'
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`The current prefix is: \`${msg.settings.prefix}\``);
    const newprefix = args.join(' ');

    if (newprefix.length > 15) return msg.channel.send('The length of the prefix must be less than 15 characters.');

    if (newprefix === msg.settings.prefix) return msg.channel.send(`The prefix is already set to ${msg.settings.prefix}`);

    this.client.settings.set(msg.guild.id, newprefix, 'prefix');
    return msg.channel.send(`The prefix has been changed to: ${newprefix}`);
  }
}

module.exports = Prefix;
