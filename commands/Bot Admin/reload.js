const Command = require('../../base/Command.js');

class Reload extends Command {
  constructor(client) {
    super(client, {
      name: 'reload',
      description: 'Reload a chat command or slash command with -i',
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
      usage: 'reload [-i <command>]',
      examples: ['reload -i search', 'reload bot-info'],
      aliases: ['r'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    if (args.length === 1) {
      const command =
        this.client.commands.get(args[0].toLowerCase()) ||
        this.client.commands.get(this.client.aliases.get(args[0].toLowerCase()));

      if (!command) return msg.reply(`The command \`${args[0]}\` does not exist, nor is it an alias.`);

      let response = await this.client.unloadCommand(command.conf.location, command.help.name);
      if (response) return this.client.util.errorEmbed(msg, response, 'Error Unloading');

      response = this.client.loadCommand(command.conf.location, command.help.name);
      if (response) return this.client.util.errorEmbed(msg, response, 'Error Loading');

      return msg.reply(`The command \`${command.help.name}\` has been reloaded`);
    }

    if (args.length !== 2) return this.client.util.errorEmbed(msg, 'Invalid Parameters');
    if (!args[0].toLowerCase() === '-i') return this.client.util.errorEmbed(msg, 'Invalid Parameter');

    const commandName = args[1].toLowerCase();
    const command = this.client.slashCommands.get(commandName);
    if (!command) return msg.reply(`The slash command \`${commandName}\` does not exist.`);

    let response = await this.client.unloadInteraction(command.conf.location, commandName);
    if (response) return this.client.util.errorEmbed(msg, response, 'Error Unloading');

    response = await this.client.loadInteraction(command.conf.location, commandName);
    if (response) return this.client.util.errorEmbed(msg, response, 'Error Loading');

    return msg.reply(`The slash command \`${commandName}\` has been reloaded`);
  }
}
module.exports = Reload;
