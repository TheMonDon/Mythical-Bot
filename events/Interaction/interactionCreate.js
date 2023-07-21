const { EmbedBuilder } = require('discord.js');

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
        const authorName = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;
        const embed = new EmbedBuilder()
          .setTitle('Missing Permission')
          .setAuthor({ name: authorName, iconURL: interaction.user.displayAvatarURL() })
          .setColor(interaction.settings.embedErrorColor)
          .addFields([
            {
              name: 'Your Level',
              value: `${level} (${this.client.config.permLevels.find((l) => l.level === level).name})`,
              inline: true,
            },
            {
              name: 'Required Level',
              value: `${this.client.levelCache[slashCommand.conf.permLevel]} (${slashCommand.conf.permLevel})`,
              inline: true,
            },
          ]);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      try {
        await slashCommand.run(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied) {
          interaction
            .followUp({
              content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``,
              ephemeral: true,
            })
            .catch((e) => console.error('An error occurred following up on an error', e));
        } else {
          interaction
            .editReply({
              content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``,
              ephemeral: true,
            })
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
