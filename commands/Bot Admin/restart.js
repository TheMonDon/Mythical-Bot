const Command = require('../../base/Command.js');

class Restart extends Command {
  constructor(client) {
    super(client, {
      name: 'restart',
      description: 'Restarts the bot',
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
      usage: 'Restart',
      aliases: ['reboot'],
    });
  }

  async run(msg) {
    try {
      await msg.reply('Bot is restarting.');
      await Promise.all(
        this.client.commands.map((command) => this.client.unloadCommand(command.conf.location, command.help.name)),
      );
      await Promise.all(
        this.client.slashCommands.map((slashCommand) =>
          this.client.unloadInteraction(slashCommand.conf.location, slashCommand.commandData.name),
        ),
      );
      process.exit(0);
    } catch (e) {
      this.client.logger.error(e);
    }
  }
}

module.exports = Restart;
