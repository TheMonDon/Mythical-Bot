import { useMainPlayer } from 'discord-player';
import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, interaction) {
  interaction.settings = client.getSettings(interaction.guild);
  const level = client.permlevel(interaction);

  const globalBlacklisted = (await db.get(`users.${interaction.user.id}.blacklist`)) || false;
  if (globalBlacklisted && level < 8) {
    const embed = new EmbedBuilder()
      .setTitle('Blacklisted')
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setColor(interaction.settings.embedErrorColor)
      .setDescription(`Sorry ${interaction.user.username}, you are currently blacklisted from using commands.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.guild) {
    const blacklisted =
      (await db.get(`servers.${interaction.guild.id}.users.${interaction.user.id}.blacklist`)) || false;
    if (blacklisted && level < 4) {
      const embed = new EmbedBuilder()
        .setTitle('Blacklisted')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(interaction.settings.embedErrorColor)
        .setDescription(
          `Sorry ${interaction.user.username}, you are currently blacklisted from using commands in this server.`,
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.isCommand()) {
    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand) return;

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
      await slashCommand.run(interaction, level);
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
  }

  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== 'music') {
      return;
    }

    try {
      const song = interaction.options.getString('song');
      if (!song || song.trim().length === 0) {
        return interaction.respond([]);
      }

      const player = useMainPlayer();

      const data = await player.search(song, { requestedBy: interaction.user });

      if (!data.hasTracks()) {
        return interaction.respond([]);
      }

      const results = data.tracks
        .filter((track) => track.url.length < 100)
        .slice(0, 10)
        .map((track) => ({
          name: track.title.slice(0, 100),
          value: track.url,
        }));

      return interaction.respond(results);
    } catch (error) {
      client.logger.error('Error handling autocomplete:', error);

      return interaction.respond([]);
    }
  }
}
