const Command = require('../../base/Command.js');

class Prefix extends Command {
  constructor(client) {
    super(client, {
      name: 'prefix',
      description: 'View or change the guild prefix',
      category: 'Administrator',
      permLevel: 'Administrator',
      usage: 'prefix [New Prefix]',
    });
  }

  async run(msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`The current prefix is: \`${msg.settings.prefix}\``);
    const newPrefix = args.join(' ');

    if (newPrefix.length > 15)
      return this.client.util.errorEmbed(msg, 'Prefix length must be less than 15 characters.');

    if (newPrefix === msg.settings.prefix)
      return this.client.util.errorEmbed(msg, `The prefix is already set to ${msg.settings.prefix}`);

    this.client.settings.set(msg.guild.id, newPrefix, 'prefix');
    return msg.channel.send(`The prefix has been changed to: ${newPrefix}`);
  }
}

module.exports = Prefix;
