module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(interaction) {
    // If it's not a command, stop.
    if (interaction.isCommand()) {
      // Grab the command data from the client.slashcmds Collection
      const cmd = this.client.slashcmds.get(interaction.commandName);

      // If that command doesn't exist, silently exit and do nothing
      if (!cmd) return;

      interaction.settings = this.client.getSettings(interaction.guild);

      const level = this.client.permlevel(interaction);
      if (level < this.client.levelCache[cmd.conf.permLevel]) {
        return interaction.reply(`You do not have permission to use this command.
Your permission level is ${level} (${this.client.config.permLevels.find((l) => l.level === level).name})
This command requires level ${this.client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`);
      }

      // Run the command
      try {
        await cmd.run(this.client, interaction);
      } catch (e) {
        console.error(e);
        if (interaction.replied) {
          interaction
            .followUp({ content: `There was a problem with your request.\n\`\`\`${e.message}\`\`\``, ephemeral: true })
            .catch((e) => console.error('An error occurred following up on an error', e));
        } else {
          interaction
            .editReply({ content: `There was a problem with your request.\n\`\`\`${e.message}\`\`\``, ephemeral: true })
            .catch((e) => console.error('An error occurred replying on an error', e));
        }
      }
    }
  }
};
