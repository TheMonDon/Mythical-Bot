const Command = require('../../base/Command.js');

class Disable extends Command {
  constructor(client) {
    super(client, {
      name: 'disable',
      description: 'Disable a command or category',
      usage: 'Disable <command/category>',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    // Disable command
    if (this.client.commands.has(args[0])) {
      // Check if command is already disabled
      if (this.client.settings.get(msg.guild.id).disabledCommands.includes(args[0]))
        return msg.reply('This command is already disabled.');

      // Check if command is a bot owner only command
      const command = this.client.commands.get(args[0]);
      if (command.permLevel === 'Bot Owner') return msg.reply("You can't disable this command.");
      this.client.settings.setProp(msg.guild.id, 'disabledCommands', command.help.name);
      return msg.reply(`The \`${command.help.name}\` command has been disabled.`);
    }
  }
}

module.exports = Disable;
