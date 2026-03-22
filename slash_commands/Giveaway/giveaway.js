const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} = require('discord.js');
const ms = require('ms');
const { parseStoredUserIds, selectGiveawayWinners, mergeWinnerHistory } = require('../../util/GiveawayUtil.js');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Giveaway management')
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Create a new giveaway')
      .addStringOption((opt) =>
        opt
          .setName('prize')
          .setDescription('What is being given away?')
          .setMinLength(1)
          .setMaxLength(200)
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt.setName('winners').setDescription('Number of winners').setMinValue(1).setRequired(true),
      )
      .addStringOption((opt) => opt.setName('duration').setDescription('Ex: 2h, 1d, 30m').setRequired(true))
      .addChannelOption((opt) => opt.setName('channel').setDescription('Where to post the giveaway'))
      .addStringOption((opt) =>
        opt.setName('description').setDescription('Extra details about the prize').setMinLength(0).setMaxLength(1000),
      )
      .addRoleOption((opt) => opt.setName('required_role').setDescription('Role required to enter the giveaway'))
      .addRoleOption((opt) => opt.setName('ping_role').setDescription('Role to ping when giveaway starts'))
      .addUserOption((opt) => opt.setName('host').setDescription('Host of the giveaway (defaults to command user)'))
      .addStringOption((opt) =>
        opt.setName('thumbnail_url').setDescription('Thumbnail image URL for the giveaway embed'),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('delete')
      .setDescription('Delete an active giveaway')
      .addStringOption((opt) =>
        opt.setName('giveaway').setDescription('Select a giveaway to delete').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('end')
      .setDescription('End an active giveaway')
      .addStringOption((opt) =>
        opt.setName('giveaway').setDescription('Select a giveaway to end').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('View information about an active giveaway')
      .addStringOption((opt) =>
        opt.setName('giveaway').setDescription('Select a giveaway to view').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('List all giveaways in this server'))
  .addSubcommand((sub) =>
    sub
      .setName('reroll')
      .setDescription('Reroll winners for a giveaway that has ended')
      .addStringOption((opt) =>
        opt.setName('giveaway').setDescription('Select a giveaway to reroll').setRequired(true).setAutocomplete(true),
      )
      .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of winners to select').setMinValue(1)),
  );

exports.autoComplete = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  let [rows] = [];

  // Fetch active giveaways from the database for this guild

  if (subcommand === 'end' || subcommand === 'delete') {
    [rows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          message_id,
          prize
        FROM
          giveaways
        WHERE
          server_id = ?
          AND status = 'active'
      `,
      [interaction.guild.id],
    );
  }

  if (subcommand === 'reroll') {
    [rows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          message_id,
          prize
        FROM
          giveaways
        WHERE
          server_id = ?
          AND status = 'ended'
      `,
      [interaction.guild.id],
    );
  }

  if (subcommand === 'info') {
    [rows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          message_id,
          prize
        FROM
          giveaways
        WHERE
          server_id = ?
      `,
      [interaction.guild.id],
    );
  }

  const focusedOption = interaction.options.getFocused(true);

  // Map to choices for autocomplete
  const choices = rows.map((row) => ({
    name: `${row.prize} (ID: ${row.message_id})`,
    value: row.message_id,
  }));

  // Filter based on user input
  const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));

  return interaction.respond(filtered.slice(0, 25));
};

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const giveawaySub = interaction.options.getSubcommand();

  switch (giveawaySub) {
    case 'create': {
      const prize = interaction.options.getString('prize');
      const winnerCount = interaction.options.getInteger('winners');
      const durationStr = interaction.options.getString('duration');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const description = interaction.options.getString('description') || 'Click the button below to enter!';
      const requiredRole = interaction.options.getRole('required_role');
      const pingRole = interaction.options.getRole('ping_role');
      const host = interaction.options.getUser('host') || interaction.user;
      const thumbnailURL = interaction.options.getString('thumbnail_url');

      // Parse duration
      const durationMs = ms(durationStr);
      if (!durationMs) {
        return interaction.editReply({ content: 'Invalid duration format! Use 1h, 30m, 1d, etc.' });
      }

      if (winnerCount < 1) {
        return interaction.client.util.errorEmbed(
          interaction,
          'Giveaways must have at least 1 winner.',
          'Invalid Winner Count',
        );
      } else if (winnerCount > 40) {
        return interaction.client.util.errorEmbed(
          interaction,
          'Giveaways cannot have more than 40 winners.',
          'Invalid Winner Count',
        );
      }

      if (durationMs < 60000) {
        return interaction.client.util.errorEmbed(
          interaction,
          'Giveaways must be at least 1 minute long.',
          'Invalid Duration',
        );
      } else if (durationMs > 2419200000) {
        return interaction.client.util.errorEmbed(
          interaction,
          'Giveaways cannot be longer than 4 weeks (28d)',
          'Invalid Duration',
        );
      }

      const endAt = Date.now() + durationMs;
      const unixEnd = Math.floor(endAt / 1000);

      const embed = new EmbedBuilder()
        .setTitle(prize)
        .setDescription(description)
        .setColor(interaction.settings.embedColor)
        .addFields([
          {
            name: '🎁 Giveaway Information',
            value: `**Drawing:** <t:${unixEnd}:R>\n**Hosted by:** ${host}${requiredRole ? `\n**Required Role:** <@&${requiredRole.id}>` : ''}`,
          },
        ])
        .setFooter({ text: `Winners: ${winnerCount}` })
        .setTimestamp(endAt);

      if (thumbnailURL) {
        embed.setThumbnail(thumbnailURL);
      }

      const enterButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('Enter (0)')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Primary),
      );

      const sentMsg = await channel.send({
        content: pingRole ? `${pingRole}` : undefined,
        embeds: [embed],
        components: [enterButton],
      });

      // Save to Database
      await interaction.client.db.execute(
        /* sql */
        `
          INSERT INTO
            giveaways (
              message_id,
              channel_id,
              server_id,
              required_role,
              prize,
              winner_count,
              started_at,
              end_at,
              host_id
            )
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          sentMsg.id,
          channel.id,
          interaction.guild.id,
          requiredRole ? requiredRole.id : null,
          prize,
          winnerCount,
          Date.now(),
          endAt,
          host.id,
        ],
      );

      const startedEmbed = new EmbedBuilder()
        .setTitle('Giveaway Created!')
        .setDescription(`Your giveaway for **${prize}** has been created in ${channel}`)
        .setColor(interaction.settings.embedSuccessColor)
        .setTimestamp();

      const viewButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Link).setURL(sentMsg.url),
      );

      return interaction.editReply({ embeds: [startedEmbed], components: [viewButton] });
    }

    case 'delete': {
      // Verify giveaway exists and is active
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            giveaways
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [interaction.options.getString('giveaway'), interaction.guild.id],
      );

      const giveaway = rows[0];
      if (!giveaway) {
        return interaction.editReply({ content: 'Giveaway not found!' });
      }

      if (giveaway.status !== 'active') {
        return interaction.editReply({ content: 'Only active giveaways can be deleted!' });
      }

      // Delete giveaway entries and giveaway itself from the database
      await interaction.client.db.execute(
        /* sql */ `
          DELETE FROM giveaways
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [interaction.options.getString('giveaway'), interaction.guild.id],
      );

      await interaction.client.db.execute(
        /* sql */ `
          DELETE FROM giveaway_entries
          WHERE
            message_id = ?
        `,
        [interaction.options.getString('giveaway')],
      );

      const channel = await interaction.client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
        if (msg) {
          await msg.delete().catch(() => null);
        }
      }

      return interaction.editReply({ content: 'Giveaway has been deleted successfully!' });
    }

    case 'end': {
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            giveaways
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [interaction.options.getString('giveaway'), interaction.guild.id],
      );

      const giveaway = rows[0];
      if (!giveaway) {
        return interaction.editReply({ content: 'Giveaway not found!' });
      }

      if (giveaway.status !== 'active') {
        return interaction.editReply({ content: 'Only active giveaways can be ended!' });
      }

      await interaction.client.db.execute(
        /* sql */ `
          UPDATE giveaways
          SET
            status = 'ended',
            end_at = ?
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [Date.now(), interaction.options.getString('giveaway'), interaction.guild.id],
      );

      const embed = new EmbedBuilder()
        .setTitle('Giveaway Ended')
        .setDescription(`The giveaway for **${giveaway.prize}** has been ended.`)
        .setColor(interaction.settings.embedSuccessColor)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    case 'info': {
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            giveaways
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [interaction.options.getString('giveaway'), interaction.guild.id],
      );

      const giveaway = rows[0];
      if (!giveaway) {
        return interaction.editReply({ content: 'Giveaway not found!' });
      }

      const [entryRows] = await interaction.client.db.execute(
        /* sql */
        `
          SELECT
            COUNT(*) AS entryCount
          FROM
            giveaway_entries
          WHERE
            message_id = ?
        `,
        [giveaway.message_id],
      );

      const winnerMentions = JSON.parse(giveaway.winners)
        ?.map((id) => `<@${id}>`)
        ?.join(', ');

      const embed = new EmbedBuilder()
        .setTitle(`🎁 ${giveaway.message_id}`)
        .setDescription(giveaway.prize)
        .addFields([
          { name: 'Status', value: interaction.client.util.toProperCase(giveaway.status), inline: true },
          { name: 'Hosted By', value: `<@${giveaway.host_id}>`, inline: true },
          { name: 'Channel', value: `<#${giveaway.channel_id}>`, inline: false },
          { name: 'Total Entries', value: entryRows[0].entryCount.toLocaleString(), inline: false },
          {
            name: 'Started At',
            value: `<t:${Math.floor(giveaway.started_at / 1000)}:F> (<t:${Math.floor(giveaway.started_at / 1000)}:R>)`,
            inline: false,
          },
          {
            name: 'End Condition',
            value: `<t:${Math.floor(giveaway.end_at / 1000)}:F> (<t:${Math.floor(giveaway.end_at / 1000)}:R>)`,
            inline: false,
          },
          {
            name: 'Required Role',
            value: giveaway.required_role ? `<@&${giveaway.required_role}>` : 'None',
            inline: true,
          },
          {
            name: 'Winners',
            value:
              winnerMentions ||
              `${giveaway.winner_count.toLocaleString()} winner${giveaway.winner_count !== 1 ? 's' : ''}`,
            inline: true,
          },
        ]);

      const viewButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('View Giveaway')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guild.id}/${giveaway.channel_id}/${giveaway.message_id}`),
      );

      if (giveaway.status === 'ended' && entryRows[0].entryCount > 0) {
        viewButton.addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_view_${giveaway.message_id}`)
            .setLabel('View Participants')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Secondary),
        );
      }

      const message = await interaction.editReply({ embeds: [embed], components: [viewButton] });
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 3600000,
      });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.customId.startsWith('giveaway_view')) {
          const giveawayId = btnInteraction.customId.split('_')[2];

          const [giveawayRows] = await btnInteraction.client.db.execute(
            /* sql */ `
              SELECT
                *
              FROM
                giveaways
              WHERE
                server_id = ?
                AND message_id = ?
            `,
            [btnInteraction.guild.id, giveawayId],
          );

          if (giveawayRows.length === 0) {
            return btnInteraction.reply({ content: 'Giveaway not found.', flags: MessageFlags.Ephemeral });
          }

          const entryLimit = 20;
          const [countRows] = await btnInteraction.client.db.execute(
            /* sql */ `
              SELECT
                COUNT(*) AS total
              FROM
                giveaway_entries
              WHERE
                server_id = ?
                AND message_id = ?
            `,
            [btnInteraction.guild.id, giveawayId],
          );

          const totalEntries = countRows[0].total;
          const totalPages = Math.ceil(totalEntries / entryLimit) || 1;
          let currentPage = 1;

          // Function to generate the embed and buttons for a specific page
          const getPageData = async (page) => {
            const offset = (page - 1) * entryLimit;
            const [entries] = await btnInteraction.client.db.execute(
              /* sql */ `
                SELECT
                  user_id
                FROM
                  giveaway_entries
                WHERE
                  server_id = ?
                  AND message_id = ?
                LIMIT
                  ?
                OFFSET
                  ?
              `,
              [btnInteraction.guild.id, giveawayId, entryLimit, offset],
            );

            const entrantList = entries.map((row, i) => `**${offset + i + 1}.** <@${row.user_id}>`).join('\n');

            const btnEmbed = new EmbedBuilder()
              .setTitle(`Entrants: ${giveawayRows[0].prize}`)
              .setDescription(entrantList)
              .setFooter({ text: `Page ${page} of ${totalPages} • Total: ${totalEntries}` })
              .setColor(interaction.settings.embedColor);

            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1),
              new ButtonBuilder()
                .setCustomId('pages')
                .setLabel(`Page ${page}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages),
            );

            const viewButton = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel('View Giveaway')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Link)
                .setURL(
                  `https://discord.com/channels/${interaction.guild.id}/${giveaway.channel_id}/${giveaway.message_id}`,
                ),
            );

            return { embeds: [btnEmbed], components: [buttons, viewButton], flags: MessageFlags.Ephemeral };
          };

          // 3. Send the initial page as an update to the "View Participants" click
          const pagedMessage = await btnInteraction.update(await getPageData(currentPage));

          // 4. Create a specific collector for the pagination buttons
          const pageCollector = pagedMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === btnInteraction.user.id,
            time: 3600000,
          });

          pageCollector.on('collect', async (i) => {
            if (i.customId === 'prev_page') currentPage--;
            if (i.customId === 'next_page') currentPage++;

            await i.update(await getPageData(currentPage));
          });

          pageCollector.on('end', () => {
            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            );
            interaction.editReply({ components: [buttons] }).catch(() => null);
          });
        }
      });

      collector.on('end', () => {
        // Clean up buttons after 1 hour
        interaction.editReply({ components: [] }).catch(() => null);
      });

      break;
    }

    case 'list': {
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            message_id,
            channel_id,
            prize,
            status
          FROM
            giveaways
          WHERE
            server_id = ?
            AND status = 'active'
        `,
        [interaction.guild.id],
      );

      const embed = new EmbedBuilder()
        .setTitle('Active Giveaways')
        .setDescription(
          rows.length > 0
            ? rows
                .map(
                  (g) =>
                    `**${g.prize}** [↗](https://discord.com/channels/${interaction.guild.id}/${g.channel_id}/${g.message_id})`,
                )
                .join('\n')
            : 'There are no active giveaways in this server.',
        )
        .setColor(interaction.settings.embedColor)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    case 'reroll': {
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            giveaways
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [interaction.options.getString('giveaway'), interaction.guild.id],
      );

      const giveaway = rows[0];
      if (!giveaway) {
        return interaction.client.util.errorEmbed(
          interaction,
          `Unable to find a giveaway for \`"${interaction.options.getString('giveaway')}"\`.`,
          'Invalid Giveaway',
        );
      }

      if (giveaway.status !== 'ended') {
        return interaction.client.util.errorEmbed(
          interaction,
          'Only giveaways that have ended can be rerolled.',
          'Invalid Giveaway',
        );
      }

      const winnerAmount = interaction.options.getInteger('winners') || giveaway.winner_count;

      const [entryRows] = await interaction.client.db.execute(
        /* sql */
        `
          SELECT
            user_id
          FROM
            giveaway_entries
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [giveaway.message_id, interaction.guild.id],
      );

      if (entryRows.length === 0) {
        return interaction.client.util.errorEmbed(
          interaction,
          'No entries were found for this giveaway.',
          'Invalid Giveaway',
        );
      }

      const entryUserIds = entryRows.map((row) => row.user_id);
      const previousWinnerIds = parseStoredUserIds(giveaway.winner_history || giveaway.winners);
      const { eligibleEntryCount, winners } = selectGiveawayWinners(entryUserIds, previousWinnerIds, winnerAmount);

      if (winners.length === 0) {
        return interaction.client.util.errorEmbed(
          interaction,
          previousWinnerIds.length >= entryRows.length
            ? 'Everyone who entered has already won this giveaway.'
            : 'There were no eligible entries to reroll.',
          'Unable to Reroll Giveaway',
        );
      }

      const winnerHistory = mergeWinnerHistory(previousWinnerIds, winners);

      await interaction.client.db.execute(
        /* sql */
        `
          UPDATE giveaways
          SET
            winners = ?,
            winner_history = ?
          WHERE
            message_id = ?
            AND server_id = ?
        `,
        [JSON.stringify(winners), JSON.stringify(winnerHistory), giveaway.message_id, interaction.guild.id],
      );

      const entryCount = entryRows.length;
      const winnerMentions = winners.map((id) => `<@${id}>`).join(', ');

      const channel = await interaction.client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (!channel) {
        return interaction.editReply({ content: 'Could not fetch giveaway channel to update!' });
      }

      const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
      if (!message) {
        return interaction.editReply({ content: 'Could not fetch giveaway message to update!' });
      }

      const embed = EmbedBuilder.from(message.embeds[0]).setFields([
        {
          name: '🎁 Giveaway Information',
          value: `**Ended:** <t:${Math.floor(giveaway.end_at / 1000)}:R>\n**Hosted by:** <@${giveaway.host_id}>${giveaway.required_role ? `\n**Required Role:** <@&${giveaway.required_role}>` : ''}`,
        },
      ]);
      const disabledButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel(`Enter (${entryCount})`)
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );
      await message.edit({ embeds: [embed], components: [disabledButton] });

      await message.reply(`Congratulations ${winnerMentions}! You won the **${giveaway.prize}** giveaway!`);

      const excludedWinnerCount = Math.max(0, entryCount - eligibleEntryCount);

      const successEmbed = new EmbedBuilder()
        .setTitle('Giveaway Rerolled!')
        .setDescription(
          `The giveaway for **${giveaway.prize}** has been rerolled. The new winner${
            winners.length > 1 ? 's are' : ' is'
          }: ${winnerMentions}\n\n${excludedWinnerCount} previous winner${excludedWinnerCount === 1 ? '' : 's'} ${excludedWinnerCount === 1 ? 'was' : 'were'} excluded from the draw.`,
        )
        .setColor(interaction.settings.embedSuccessColor)
        .setTimestamp();

      return interaction.editReply({ embeds: [successEmbed] });
    }

    default: {
      return interaction.editReply({ content: 'Unknown giveaway subcommand!' });
    }
  }
};
