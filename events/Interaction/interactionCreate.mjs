import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, interaction) {
  if (interaction.isCommand()) {
    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand) return;

    interaction.settings = client.getSettings(interaction.guild);

    const level = client.permlevel(interaction);
    if (level < client.levelCache[slashCommand.conf.permLevel]) {
      const embed = new EmbedBuilder()
        .setTitle('Missing Permission')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(interaction.settings.embedErrorColor)
        .addFields([
          {
            name: 'Your Level',
            value: `${level} (${client.config.permLevels.find((l) => l.level === level).name})`,
            inline: true,
          },
          {
            name: 'Required Level',
            value: `${client.levelCache[slashCommand.conf.permLevel]} (${slashCommand.conf.permLevel})`,
            inline: true,
          },
        ]);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await slashCommand.run(interaction);
      await db.add('global.commands', 1);
    } catch (error) {
      client.logger.error(error);
      if (interaction.replied) {
        interaction
          .followUp({
            content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``,
            ephemeral: true,
          })
          .catch((e) => client.logger.error('An error occurred following up on an error', e));
      } else {
        interaction
          .editReply({
            content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``,
            ephemeral: true,
          })
          .catch((e) => client.logger.error('An error occurred replying on an error', e));
      }
    }
  } else if (interaction.isAutocomplete()) {
    const slashCommand = interaction.client.commands.get(interaction.commandName);

    if (!slashCommand) {
      client.logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await slashCommand.autocomplete(interaction);
      await db.add('global.commands', 1);
    } catch (error) {
      client.logger.error(error);
    }
  }
}
