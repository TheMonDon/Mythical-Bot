const Command = require('../../base/Command.js');

class Reload extends Command {
  constructor(client) {
    super(client, {
      name: 'reload',
      description: 'Reloads a command that has been modified.',
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
      usage: 'Reload [-i <command>]',
      aliases: ['r'],
    });
  }

  async run(msg, args) {
    if (!args || args.length < 1) return msg.reply('Must provide a command to reload.');

    if (args.length === 1) {
      const command = this.client.commands.get(args[0].toLowerCase()) || this.client.commands.get(this.client.aliases.get(args[0].toLowerCase()));
      if (!command) return msg.reply(`The command \`${args[0]}\` does not exist, nor is it an alias.`);
  
      let response = await this.client.unloadCommand(command.conf.location, command.help.name);
      if (response) return msg.reply(`Error unloading: ${response}`);
  
      response = this.client.loadCommand(command.conf.location, command.help.name);
      if (response) return msg.reply(`Error loading: ${response}`);
  
      return msg.reply(`The command \`${command.help.name}\` has been reloaded`);
    }
    if (args.length === 2) {
      if (!args[0].toLowerCase() === '-i') return msg.channel.send('Invalid parameter');
  
      const commandName = args[1].toLowerCase();
      const command = this.client.slashCommands.get(commandName);
      if (!command) return msg.reply(`The slash command \`${commandName}\` does not exist.`);

      let response = await this.client.unloadInteraction(command.conf.location, commandName);
      if (response) return msg.reply(`Error unloading: ${response}`);

      response = await this.client.loadInteraction(command.conf.location, commandName);
      if (response) return msg.reply(`Error loading: ${response}`);

      return msg.reply(`The slash command \`${commandName}\` has been reloaded`);
    }
  }
}
module.exports = Reload;
