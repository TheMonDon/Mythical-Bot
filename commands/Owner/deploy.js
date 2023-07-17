const Command = require('../../base/Command.js');

module.exports = class Deploy extends Command {
  constructor(client) {
    super(client, {
      name: 'deploy',
      description: 'This will deploy all slash commands.',
      category: 'Owner',
      permLevel: 'Bot Owner',
      usage: 'deploy',
    });
  }

  async run(message) {
    // We'll partition the slash commands based on the guildOnly boolean.
    // Separating them into the correct objects defined in the array below.
    const [guildCmds, globalCmds] = this.client.slashCommands.partition((c) => c.guildOnly);

    // Give the user a notification the commands are deploying.
    const reply = await message.channel.send('Deploying commands!');

    // We'll use set but please keep in mind that `set` is overkill for a singular command.
    // Set the guild commands like this.
    await this.client.guilds.cache.get(message.guild.id)?.commands.set(guildCmds.map((c) => c.commandData));

    // Then set the global commands like this.
    await this.client.application?.commands
      .set(globalCmds.map((c) => c.commandData))
      .catch((e) => this.client.logger.error(e));

    // Reply to the user that the commands have been deployed.
    await reply.edit('All commands deployed!');
  }
};
