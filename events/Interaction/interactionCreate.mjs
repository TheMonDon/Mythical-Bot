import {
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
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
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
            flags: MessageFlags.Ephemeral,
          })
          .catch((e) => client.logger.error('An error occurred following up on an error', e));
      } else {
        interaction
          .editReply({
            content: `There was a problem with your request.\n\`\`\`${error.message}\`\`\``,
            flags: MessageFlags.Ephemeral,
          })
          .catch((e) => client.logger.error('An error occurred replying on an error', e));
      }
    }
  }

  if (interaction.isAutocomplete()) {
    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand) return;
    await slashCommand.autoComplete(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'create_ticket') {
      if (!(await db.get(`servers.${interaction.guild.id}.tickets`))) return;

      // Create the modal
      const modal = new ModalBuilder().setCustomId('ticket_reason').setTitle('Ticket Reason');
      const reasonInput = new TextInputBuilder()
        .setMaxLength(100)
        .setMinLength(1)
        .setCustomId('reasonInput')
        .setLabel("What's the reason for your ticket?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const ActionRow = new ActionRowBuilder().addComponents(reasonInput);

      modal.addComponents(ActionRow);

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ticket_reason') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const { catID, logID, roleID } = await db.get(`servers.${interaction.guild.id}.tickets`);

      if (!interaction.guild.members.me.permissions.has('ManageChannels')) {
        return interaction.editReply('The bot is missing `Manage Channels` permission.');
      }
      if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
        return interaction.editReply('The bot is missing `Manage Roles` permission');
      }
      if (!interaction.guild.members.me.permissions.has('ManageMessages')) {
        return interaction.editReply('The bot is missing `Manage Messages` permission');
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);

      const perms = [
        {
          id: interaction.user.id,
          allow: ['ViewChannel'],
        },
        {
          id: interaction.guild.members.me.id,
          allow: ['ViewChannel'],
        },
        {
          id: roleID,
          allow: ['ViewChannel'],
        },
        {
          id: interaction.guild.id,
          deny: ['ViewChannel'],
        },
      ];

      const reason = interaction.fields.getTextInputValue('reasonInput');

      let channelName = interaction.member.displayName.toLowerCase();
      channelName = channelName.replace(/[^a-zA-Z\d:]/g, '');
      if (channelName.length === 0) {
        channelName = interaction.member.user.username.replace(/[^a-zA-Z\d:]/g, '');
        if (channelName.length === 0) {
          channelName = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
        }
      }

      const tName = `ticket-${channelName}`;
      const tixChan = await interaction.guild.channels.create({
        name: tName,
        type: ChannelType.GuildText,
        parent: catID,
        permissionOverwrites: perms,
        topic: reason,
      });

      await db.set(`servers.${interaction.guild.id}.tickets.${tixChan.id}.owner`, member.id);

      const logEmbed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
        .setTitle('New Ticket Created')
        .addFields([
          { name: 'Author', value: `${member} (${member.id})`, inline: false },
          { name: 'Channel', value: `${tixChan} \n(${tName}: ${tixChan.id})`, inline: false },
          { name: 'Reason', value: reason, inline: false },
        ])
        .setColor('#E65DF4')
        .setTimestamp();
      const logChan = interaction.guild.channels.cache.get(logID);
      await logChan.send({ embeds: [logEmbed] }).catch(() => {});

      const chanEmbed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
        .setTitle(`${member.displayName}'s Ticket`)
        .addFields([{ name: 'Reason', value: reason, inline: false }])
        .setDescription('Please wait patiently and our support team will be with you shortly.')
        .setColor('#E65DF4')
        .setTimestamp();
      const role = interaction.guild.roles.cache.get(roleID);

      if (!role.mentionable) {
        if (!tixChan.permissionsFor(client.user.id).has('MentionEveryone')) {
          await role.setMentionable(true);
          await tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
          return await role.setMentionable(false);
        }
      }

      interaction.editReply(`Your ticket is available here: ${tixChan}`);
      return tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
    }
  }
}
