module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (interaction) {
    // If it's not a command, stop.
    if (interaction.isCommand()) {
      // Grab the command data from the client.slashcmds Collection
      const cmd = this.client.slashcmds.get(interaction.commandName);

      // If that command doesn't exist, silently exit and do nothing
      if (!cmd) return;

      const settings = this.client.getSettings(interaction.guild);
      interaction.settings = settings;

      // Run the command
      try {
        await cmd.run(this.client, interaction);
      } catch (e) {
        console.error(e);
        if (interaction.replied) {
          interaction.followUp({ content: `There was a problem with your request.\n\`\`\`${e.message}\`\`\``, ephemeral: true })
            .catch(e => console.error('An error occurred following up on an error', e));
        } else {
          interaction.reply({ content: `There was a problem with your request.\n\`\`\`${e.message}\`\`\``, ephemeral: true })
            .catch(e => console.error('An error occurred replying on an error', e));
        }
      }
    }
  }
};
