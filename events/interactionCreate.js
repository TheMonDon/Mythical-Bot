module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(interaction) {
    if (interaction.isCommand()) {
      const slashCommand = this.client.slashCommands.get(interaction.commandName);
      if (!slashCommand) return;

      interaction.settings = this.client.getSettings(interaction.guild);

      const level = this.client.permlevel(interaction);
      if (level < this.client.levelCache[slashCommand.conf.permLevel]) {
        return interaction.reply(`You do not have permission to use this command.
Your permission level is ${level} (${this.client.config.permLevels.find((l) => l.level === level).name})
This command requires level ${this.client.levelCache[slashCommand.conf.permLevel]} (${slashCommand.conf.permLevel})`);
      }

      try {
        await slashCommand.run(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied) {
          interaction
            .followUp({ content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``, ephemeral: true })
            .catch((e) => console.error('An error occurred following up on an error', e));
        } else {
          interaction
            .editReply({ content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``, ephemeral: true })
            .catch((e) => console.error('An error occurred replying on an error', e));
        }
      }
    } else if (interaction.isAutocomplete()) {
      const slashCommand = interaction.client.commands.get(interaction.commandName);

      if (!slashCommand) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
  
      try {
        await slashCommand.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    }
  }
};
