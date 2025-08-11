import {
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { QuickDB } from 'quick.db';
import { stripIndents } from 'common-tags';
import * as discordTranscripts from 'discord-html-transcripts';
const db = new QuickDB();

export async function run(client, interaction) {
  interaction.settings = client.getSettings(interaction.guild);
  const level = await client.permlevel(interaction);

  // Check for global blacklist
  const connection = await interaction.client.db.getConnection();
  const [gblacklistRows] = await connection.execute(`SELECT * FROM global_blacklists WHERE user_id = ?`, [
    interaction.user.id,
  ]);
  connection.release();
  const globalBlacklisted = gblacklistRows[0]?.blacklisted;

  if (globalBlacklisted && level < 8) {
    const blacklistReason = gblacklistRows[0]?.reason || 'No reason provided';

    const embed = new EmbedBuilder()
      .setTitle('Global Blacklisted')
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setColor(interaction.settings.embedErrorColor)
      .setDescription(`Sorry ${interaction.user.username}, you are currently blacklisted from using commands.`)
      .addFields([{ name: 'Reason', value: blacklistReason, inline: false }]);

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Check for server blacklist
  if (interaction.guild) {
    const connection = await client.db.getConnection();
    const [blacklistRows] = await connection.execute(
      `SELECT * FROM server_blacklists WHERE server_id = ? AND user_id = ?`,
      [interaction.guild.id, interaction.user.id],
    );
    connection.release();

    const blacklisted = blacklistRows[0]?.blacklisted;
    const reason = blacklistRows[0]?.reason || 'No reason provided';

    if (blacklisted && level < 4) {
      const embed = new EmbedBuilder()
        .setTitle('Server Blacklisted')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(interaction.settings.embedErrorColor)
        .setDescription(
          `Sorry ${interaction.user.username}, you are currently blacklisted from using commands in this server.`,
        )
        .addFields([{ name: 'Reason', value: reason, inline: false }]);

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
            value: `${level} (${client.permLevels.find((l) => l.level === level).name})`,
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
      const isText = false;
      const isSlash = true;
      const isAlias = false;
      const aliasName = null;

      const connection = await client.db.getConnection();
      await connection.query('CALL updateCommandStats(?, ?, ?, ?, ?)', [
        interaction.commandName,
        isText ? 1 : 0,
        isSlash ? 1 : 0,
        isAlias ? 1 : 0,
        aliasName || null,
      ]);

      connection.release();
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
      const connection = await client.db.getConnection();
      const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [
        interaction.guild.id,
      ]);

      if (rows.length === 0) {
        connection.release();
        return interaction.reply({
          content:
            'The ticket system has not been setup in this server. Please contact a server administrator to re-run the setup command.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const blacklisted =
        (await db.get(`servers.${interaction.guild.id}.users.${interaction.user.id}.blacklist`)) || false;
      if (blacklisted && level < 4) {
        const embed = new EmbedBuilder()
          .setTitle('Blacklisted')
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setColor(interaction.settings.embedErrorColor)
          .setDescription(
            `Sorry ${interaction.user.username}, you are currently blacklisted from using tickets in this server.`,
          );

        connection.release();
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      const userTickets = await client.util.getTickets(client, interaction.user.id, interaction);
      if (userTickets >= rows[0].ticket_limit) {
        connection.release();
        return interaction.reply({
          content: `Sorry ${interaction.member.displayName}, you already have ${userTickets} of ${rows[0].ticket_limit} tickets open. Please close one before making a new one.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create the modal
      const reasonInput = new TextInputBuilder()
        .setMinLength(1)
        .setMaxLength(1024)
        .setCustomId('reasonInput')
        .setLabel('Reason')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const ActionRow = new ActionRowBuilder().addComponents(reasonInput);
      const modal = new ModalBuilder().setCustomId('ticket_reason').setTitle('Ticket Reason').addComponents(ActionRow);

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'close_ticket') {
      const connection = await client.db.getConnection();
      const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [
        interaction.guild.id,
      ]);

      if (rows.length === 0) {
        connection.release();
        return interaction.reply({
          content:
            'The ticket system has not been setup in this server. Please contact a server administrator to re-run the setup command.',
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create the modal

      const reasonInput = new TextInputBuilder()
        .setMinLength(1)
        .setMaxLength(1024)
        .setCustomId('reasonInput')
        .setLabel('Reason')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      const ActionRow = new ActionRowBuilder().addComponents(reasonInput);

      const modal = new ModalBuilder()
        .setCustomId('close_ticket_reason')
        .setTitle('Ticket Close Reason')
        .addComponents(ActionRow);

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    // Handle modal submissions for ticket creation
    if (interaction.customId === 'ticket_reason') {
      const connection = await client.db.getConnection();
      const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [
        interaction.guild.id,
      ]);

      if (rows.length === 0) {
        connection.release();
        return interaction.reply({
          content:
            'The ticket system has not been setup in this server. Please contact a server administrator to re-run the setup command.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const catID = rows[0].category_id;
      const roleID = rows[0].role_id;
      const logID = rows[0].logging_id;

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

      const reason = interaction.fields.getTextInputValue('reasonInput') || 'No reason specified';

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

      await connection.execute(
        `INSERT INTO user_tickets (server_id, channel_id, user_id)
         VALUES (?, ?, ?)`,
        [interaction.guild.id, tixChan.id, member.id],
      );

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

      // Create the persistent close button
      const button = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Success);
      const row = new ActionRowBuilder().addComponents(button);

      const role = interaction.guild.roles.cache.get(roleID);

      if (!role.mentionable) {
        if (!tixChan.permissionsFor(client.user.id).has('MentionEveryone')) {
          await role.setMentionable(true);
          await tixChan.send({ content: role.toString(), embeds: [chanEmbed], components: [row] }).catch(() => {});
          return await role.setMentionable(false);
        }
      }

      await interaction.editReply(`Your ticket is available here: ${tixChan}`);
      const chanMessage = await tixChan
        .send({ content: role.toString(), embeds: [chanEmbed], components: [row] })
        .catch(() => {});
      return chanMessage.pin();
    }

    // Handle modal submissions for ticket closing
    if (interaction.customId === 'close_ticket_reason') {
      const connection = await client.db.getConnection();
      const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [
        interaction.guild.id,
      ]);

      if (rows.length === 0) {
        connection.release();
        return interaction.reply({
          content:
            'The ticket system has not been setup in this server. Please contact a server administrator to re-run the setup command.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();
      const logID = rows[0].logging_id;
      const roleID = rows[0].role_id;

      const tName = interaction.channel.name;
      const role = interaction.guild.roles.cache.get(roleID);
      const [ownerRows] = await connection.execute(
        `SELECT user_id FROM user_tickets WHERE server_id = ? AND channel_id = ?`,
        [interaction.guild.id, interaction.channel.id],
      );
      const owner = ownerRows[0].user_id;

      if (owner !== interaction.user.id) {
        if (!interaction.member.roles.cache.some((r) => r.id === roleID)) {
          return interaction.editReply(`You need to be the ticket owner or a member of ${role.name} to use this.`);
        }
      }

      const reason = interaction.fields.getTextInputValue('reasonInput') || 'No reason specified';

      const em = new EmbedBuilder().setTitle('Ticket Closed').setColor('#E65DF4')
        .setDescription(stripIndents`${interaction.user} has requested to close this ticket.
          The ticket will close in 5 minutes if no further activity occurs.

          Reason: ${reason}
        `);
      await interaction.editReply({ embeds: [em] });

      const filter = (m) => m.content?.length > 0;

      const collected = await interaction.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 300000,
          errors: ['time'],
        })
        .catch(() => null);

      if (!collected) {
        const attachment = await discordTranscripts.createTranscript(interaction.channel);
        let received;

        const userEmbed = new EmbedBuilder()
          .setTitle('Ticket Closed')
          .setColor('#E65DF4')
          .addFields([
            { name: 'Reason', value: reason, inline: false },
            { name: 'Server', value: interaction.guild.name, inline: false },
          ])
          .setTimestamp();
        const user = await client.users.fetch(owner);
        await user.send({ embeds: [userEmbed], files: [attachment] }).catch(() => {
          received = 'no';
        });

        const logEmbed = new EmbedBuilder()
          .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
          .setTitle('Ticket Closed')
          .addFields([
            { name: 'Author', value: `<@${owner}> (${owner})`, inline: false },
            { name: 'Channel', value: `${tName}: ${interaction.channel.id}`, inline: false },
            { name: 'Reason', value: reason, inline: false },
          ])
          .setColor('#E65DF4')
          .setTimestamp();
        if (received === 'no') logEmbed.setFooter({ text: 'Could not message author' });

        await interaction.guild.channels.cache
          .get(logID)
          .send({ embeds: [logEmbed], files: [attachment] })
          .catch((e) => client.logger.error(e));

        await connection.execute(
          `DELETE FROM user_tickets 
             WHERE server_id = ? AND channel_id = ?`,
          [interaction.guild.id, interaction.channel.id],
        );
        connection.release();

        return interaction.channel.delete();
      }

      const response = collected.first().content;
      const embed = new EmbedBuilder()
        .setTitle('Ticket Re-Opened')
        .setDescription(
          stripIndents`
              Closing of the ticket has been cancelled with the following reason:
      
              ${response}`,
        )
        .setColor('#E65DF4')
        .setTimestamp();

      connection.release();
      return interaction.channel.send({ embeds: [embed] });
    }
  }
}
