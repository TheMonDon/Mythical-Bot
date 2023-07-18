const Command = require('../../base/Command.js');

class Reload extends Command {
  constructor(client) {
    super(client, {
      name: 'reload',
      description: 'Reloads a command that has been modified.',
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
      usage: 'Reload <Command>',
      aliases: ['r'],
    });
  }

  async run(message, args) {
    if (!args || args.length < 1) return message.reply('Must provide a command to reload.');

    const commands = this.client.commands.get(args[0]) || this.client.commands.get(this.client.aliases.get(args[0]));
    if (!commands) return message.reply(`The command \`${args[0]}\` does not exist, nor is it an alias.`);

    let response = await this.client.unloadCommand(commands.conf.location, commands.help.name);
    if (response) return message.reply(`Error unloading: ${response}`);

    response = this.client.loadCommand(commands.conf.location, commands.help.name);
    if (response) return message.reply(`Error loading: ${response}`);

    return message.reply(`The command \`${commands.help.name}\` has been reloaded`);
  }
}
module.exports = Reload;
