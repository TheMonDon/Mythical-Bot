const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('overrides')
  .setDescription('Manage starboard overrides')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a new override')
      .addStringOption((option) => option.setName('name').setDescription('The name of the override').setRequired(true))
      .addStringOption((option) =>
        option
          .setName('starboard')
          .setDescription('The starboard to link this override to')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View an override')
      .addStringOption((option) =>
        option.setName('name').setDescription('The name of the override').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Delete an override')
      .addStringOption((option) =>
        option.setName('name').setDescription('The name of the override').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('channels')
      .setDescription('Edit a overrides channels')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add a channel to the override')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to add a channel to')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addChannelOption((option) =>
            option.setName('channel').setDescription('The channel to add').setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Remove a channel from the override')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to add a channel to')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addChannelOption((option) =>
            option.setName('channel').setDescription('The channel to remove').setRequired(true),
          ),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('edit')
      .setDescription('Edit a overrides setting')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('requirements')
          .setDescription('Edit the requirements for a message to appear on the starboard')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to edit')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addIntegerOption((option) =>
            option
              .setName('threshold')
              .setDescription('The upvote-emoji threshold before creating posts (default: 3)')
              .setMinValue(1),
          )
          .addStringOption((option) =>
            option
              .setName('threshold-remove')
              .setDescription("The downvote-emoji threshold before removing posts. Use 'none' to unset (default: 0)"),
          )
          .addStringOption((option) =>
            option.setName('upvote-emoji').setDescription('New upvote-emoji to use (default: ⭐)'),
          )
          .addStringOption((option) =>
            option
              .setName('downvote-emoji')
              .setDescription("The emoji that can be used to downvote a post. Use 'none' to remove (default: none)"),
          )
          .addBooleanOption((option) =>
            option
              .setName('self-vote')
              .setDescription('Whether to allow users to vote on their own posts (default: false)'),
          )
          .addBooleanOption((option) =>
            option.setName('allow-bots').setDescription('Whether to allow bot messages to be voted on (default: true)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('require-image')
              .setDescription('Whether to require messages to have an image to post to a starboard (default: false)'),
          )
          .addStringOption((option) =>
            option
              .setName('older-than')
              .setDescription(
                'Only messages older than this can be voted on (e.g. "1 hour"). Use 0 to disable (default: 0)',
              ),
          )
          .addStringOption((option) =>
            option
              .setName('newer-than')
              .setDescription(
                'Only messages newer than this can be voted on (e.g. "1 hour"). Use 0 to disable (default: 0)',
              ),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('style')
          .setDescription('Edit the general style of the override')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to edit')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option.setName('display-emoji').setDescription('New display-emoji to use (default: ⭐)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('ping-author')
              .setDescription('Whether to mention the author of the original message (default: false)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('extra-embeds')
              .setDescription('Whether to include embeds from the message in the starboard (default: true)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('use-server-profile')
              .setDescription('Whether to use the users server profile for embeds (default: true)'),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('behavior')
          .setDescription('Edit how the override should behave')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to edit')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addBooleanOption((option) =>
            option.setName('enabled').setDescription('Whether the starboard should be enabled'),
          )
          .addBooleanOption((option) =>
            option
              .setName('autoreact-upvote')
              .setDescription(
                'Whether to automatically react to posts on the starboard with the upvote-emoji (default: true)',
              ),
          )
          .addBooleanOption((option) =>
            option
              .setName('autoreact-downvote')
              .setDescription(
                'Whether to automatically react to posts on the starboard with the downvote-emoji (default: true)',
              ),
          )
          .addBooleanOption((option) =>
            option
              .setName('link-deletes')
              .setDescription(
                'Whether to delete a starboard post if the original message was deleted (default: false)',
              ),
          )
          .addBooleanOption((option) =>
            option
              .setName('link-edits')
              .setDescription(
                'Whether to update the starboard message if the original message is edited (default: true)',
              ),
          )
          .addBooleanOption((option) =>
            option
              .setName('remove-invalid-reactions')
              .setDescription("Whether to remove reactions that don't meet requirements (default: true)"),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('embed')
          .setDescription('Edit the style of the embeds sent to the starboard')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the override to edit')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option.setName('color').setDescription('New color of the embed (default: server embed color)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('replied-to')
              .setDescription('Whether to include the message that was replied to (default true)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('attachments-list')
              .setDescription('Whether to list the names (as hyperlinks) of uploaded attachments. (default true)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('show-thumbnail')
              .setDescription('Whether to include the author pfp in the embed thumbnail (default: true)'),
          ),
      ),
  );

exports.autoComplete = async (interaction) => {
  const connection = await interaction.client.db.getConnection();

  try {
    if (interaction.options.getSubcommand() === 'create') {
      const focused = interaction.options.getFocused(true); // { name, value }
      const query = (typeof focused?.value === 'string' ? focused.value : '').trim();

      let rows;
      if (query === '') {
        // show all names for this server (up to 25)
        const [r] = await connection.execute(
          /* sql */ `
            SELECT
              name
            FROM
              starboards
            WHERE
              server_id = ?
            ORDER BY
              name
            LIMIT
              25
          `,
          [interaction.guild.id],
        );
        rows = r;
      } else {
        // escape %, _ and \
        const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`.toLowerCase();

        const [r] = await connection.execute(
          /* sql */
          `
            SELECT
              name
            FROM
              starboards
            WHERE
              server_id = ?
              AND LOWER(name) LIKE ?
            ORDER BY
              name
            LIMIT
              25
          `,
          [interaction.guild.id, like],
        );
        rows = r;
      }

      // respond
      const choices = rows.map((r) => ({ name: r.name, value: r.name }));
      await interaction.respond(choices).catch(() => {});
    }

    // Get overrides
    const focused = interaction.options.getFocused(true); // { name, value }
    const query = (typeof focused?.value === 'string' ? focused.value : '').trim();

    let rows;
    if (query === '') {
      // no input → show all override names (up to 25) for this guild
      const [r] = await connection.execute(
        /* sql */
        `
          SELECT
            so.name
          FROM
            starboard_overrides so
            JOIN starboards s ON so.starboard_id = s.id
          WHERE
            s.server_id = ?
          ORDER BY
            so.name
          LIMIT
            25
        `,
        [interaction.guild.id],
      );
      rows = r;
    } else {
      // input → filter overrides by LIKE, case-insensitive
      const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
      const [r] = await connection.execute(
        /* sql */
        `
          SELECT
            so.name
          FROM
            starboard_overrides so
            JOIN starboards s ON so.starboard_id = s.id
          WHERE
            s.server_id = ?
            AND LOWER(so.name) LIKE LOWER(?) ESCAPE '\\'
          ORDER BY
            so.name
          LIMIT
            25
        `,
        [interaction.guild.id, like],
      );
      rows = r;
    }

    const choices = rows.map((r) => ({ name: r.name, value: r.name }));
    await interaction.respond(choices).catch(() => {});
  } catch (error) {
    return interaction.respond([]).catch(() => {});
  } finally {
    connection.release();
  }
};

exports.run = async (interaction) => {
  const connection = await interaction.client.db.getConnection();

  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand();
  const subcommandGroup = interaction.options.getSubcommandGroup();

  try {
    if (!subcommandGroup) {
      switch (subcommand) {
        case 'create': {
          const starboard = interaction.options.getString('starboard');
          const name = interaction.options.getString('name');

          // Get the starboard row
          const [rows] = await connection.execute(
            /* sql */ `
              SELECT
                id,
                name
              FROM
                starboards
              WHERE
                server_id = ?
                AND LOWER(name) = LOWER(?)
            `,
            [interaction.guild.id, starboard],
          );

          if (rows.length === 0) {
            return interaction.editReply({ content: `No starboard named \`${starboard}\` exists.` });
          }

          const starboardId = rows[0].id;

          // Count overrides for this starboard
          const [countRows] = await connection.execute(
            /* sql */
            `
              SELECT
                COUNT(*) AS count
              FROM
                starboard_overrides
              WHERE
                starboard_id = ?
            `,
            [starboardId],
          );

          if (countRows[0].count >= 10) {
            return interaction.editReply({
              content: `You can only create up to 10 overrides for starboard \`${rows[0].name}\`.`,
            });
          }

          try {
            await connection.execute(
              /* sql */ `
                INSERT INTO
                  starboard_overrides (starboard_id, name, channels)
                VALUES
                  (?, ?, ?)
              `,
              [starboardId, name, JSON.stringify([])],
            );

            return interaction.editReply(
              `The override \`${name}\` has been created for starboard \`${rows[0].name}\`.`,
            );
          } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return interaction.editReply(
                `An override named \`${name}\` already exists for starboard \`${rows[0].name}\`.`,
              );
            }
            console.error(err);
            return interaction.editReply(`Something went wrong while creating the override: ${err.message}`);
          }
        }

        case 'delete': {
          const overrideName = interaction.options.getString('name');

          const [rows] = await connection.execute(
            /* sql */
            `
              SELECT
                so.id,
                so.name
              FROM
                starboard_overrides so
                JOIN starboards s ON so.starboard_id = s.id
              WHERE
                s.server_id = ?
                AND LOWER(so.name) = LOWER(?)
              LIMIT
                1
            `,
            [interaction.guild.id, overrideName],
          );

          if (rows.length === 0) {
            return interaction.reply({ content: `❌ Override \`${overrideName}\` not found.`, ephemeral: true });
          }

          const override = rows[0]; // has id and original name

          // Now delete it
          const [result] = await connection.execute(
            /* sql */ `
              DELETE FROM starboard_overrides
              WHERE
                id = ?
            `,
            [override.id],
          );

          if (result.affectedRows > 0) {
            return interaction.editReply(`The override \`${override.name}\` has been deleted.`);
          } else {
            return interaction.editReply(`The override \`${overrideName}\` could not be deleted.`);
          }
        }

        case 'view': {
          const overrideName = interaction.options.getString('name');

          // Find the override and its starboard, case-insensitive
          const [rows] = await connection.execute(
            /* sql */
            `
              SELECT
                so.id AS override_id,
                so.name AS override_name,
                so.channels AS override_channels,
                so.threshold AS override_threshold,
                so.threshold_remove AS override_threshold_remove,
                so.color AS override_color,
                so.emoji AS override_emoji,
                so.display_emoji AS override_display_emoji,
                so.downvote_emoji AS override_downvote_emoji,
                so.allow_bots AS override_allow_bots,
                so.self_vote AS override_self_vote,
                so.ping_author AS override_ping_author,
                so.replied_to AS override_replied_to,
                so.link_deletes AS override_link_deletes,
                so.link_edits AS override_link_edits,
                so.autoreact_upvote AS override_autoreact_upvote,
                so.autoreact_downvote AS override_autoreact_downvote,
                so.remove_invalid_reactions AS override_remove_invalid_reactions,
                so.require_image AS override_require_image,
                so.extra_embeds AS override_extra_embeds,
                so.use_server_profile AS override_use_server_profile,
                so.show_thumbnail AS override_show_thumbnail,
                so.older_than AS override_older_than,
                so.newer_than AS override_newer_than,
                so.enabled AS override_enabled,
                so.attachments_list AS override_attachments_list,
                s.id AS starboard_id,
                s.name AS starboard_name,
                s.enabled AS starboard_enabled,
                s.channel_id AS starboard_channel_id,
                s.threshold AS starboard_threshold,
                s.threshold_remove AS starboard_threshold_remove,
                s.color AS starboard_color,
                s.emoji AS starboard_emoji,
                s.display_emoji AS starboard_display_emoji,
                s.downvote_emoji AS starboard_downvote_emoji,
                s.allow_bots AS starboard_allow_bots,
                s.self_vote AS starboard_self_vote,
                s.ping_author AS starboard_ping_author,
                s.replied_to AS starboard_replied_to,
                s.link_deletes AS starboard_link_deletes,
                s.link_edits AS starboard_link_edits,
                s.autoreact_upvote AS starboard_autoreact_upvote,
                s.autoreact_downvote AS starboard_autoreact_downvote,
                s.remove_invalid_reactions AS starboard_remove_invalid_reactions,
                s.require_image AS starboard_require_image,
                s.extra_embeds AS starboard_extra_embeds,
                s.use_server_profile AS starboard_use_server_profile,
                s.show_thumbnail AS starboard_show_thumbnail,
                s.older_than AS starboard_older_than,
                s.newer_than AS starboard_newer_than,
                s.attachments_list AS starboard_attachments_list
              FROM
                starboard_overrides so
                JOIN starboards s ON so.starboard_id = s.id
              WHERE
                s.server_id = ?
                AND LOWER(so.name) = LOWER(?)
              LIMIT
                1
            `,
            [interaction.guild.id, overrideName],
          );

          if (rows.length === 0) {
            return interaction.editReply(`No override named \`${overrideName}\` exists.`);
          }

          const row = rows[0];

          // Merge starboard config + override config (override takes priority)
          const config = {};
          for (const key in row) {
            if (key.startsWith('starboard_')) {
              config[key.replace('starboard_', '')] = row[key];
            }
          }
          for (const key in row) {
            if (key.startsWith('override_') && row[key] !== null) {
              config[key.replace('override_', '')] = row[key];
            }
          }

          const { parseMS } = await import('human-ms');

          let overridesString;
          const channels = JSON.parse(config.channels || '[]');
          const channelsString = channels?.map((channelID) => `<#${channelID}>`)?.join(', ');
          if (channelsString) {
            overridesString = `This override applies to the following channels: ${channelsString}`;
          } else {
            overridesString = `This override does not currently apply to any channels. Use \`/overrides channels add\` to apply this override to channels.`;
          }

          const mainEmbed = new EmbedBuilder()
            .setTitle(`Override "${row.override_name}"`)
            .setColor(config.color || interaction.settings.embedColor)
            .setDescription(
              stripIndents`This override belongs to the starboard \`${row.starboard_name}\`.

              ${overridesString}`,
            )
            .setTimestamp()
            .addFields([
              {
                name: 'Requirements',
                value: stripIndents`
                  Threshold: ${config.threshold}
                  Threshold-Remove: ${config.threshold_remove || config.threshold_remove === 0 ? config.threshold_remove : 'None'}
                  Upvote-Emoji: ${config.emoji}
                  Downvote-Emoji: ${config.downvote_emoji ? config.downvote_emoji : 'None'}
                  Self-Vote: ${config.self_vote ? 'True' : 'False'}
                  Allow-Bots: ${config.allow_bots ? 'True' : 'False'}
                  Require-Image: ${config.require_image ? 'True' : 'False'}
                  Older-Than: ${config.older_than ? `${parseMS(config.older_than)}` : 'Disabled'}
                  Newer-Than: ${config.newer_than ? `${parseMS(config.newer_than)}` : 'Disabled'}
                `,
                inline: true,
              },
              {
                name: 'Behavior',
                value: stripIndents`
                  Enabled: ${config.enabled ? 'True' : 'False'}
                  Autoreact-Upvote: ${config.autoreact_upvote ? 'True' : 'False'}
                  Autoreact-Downvote: ${config.autoreact_downvote ? 'True' : 'False'}
                  Link-Deletes: ${config.link_deletes ? 'True' : 'False'}
                  Link-Edits: ${config.link_edits ? 'True' : 'False'}
                  Remove-Invalid-Reactions: ${config.remove_invalid_reactions ? 'True' : 'False'}
                `,
                inline: true,
              },
              {
                name: 'Style',
                value: stripIndents`
                  Display-Emoji: ${config.display_emoji ? config.display_emoji : 'None'}
                  Ping-Author: ${config.ping_author ? 'True' : 'False'}
                  Extra-Embeds: ${config.extra_embeds ? 'True' : 'False'}
                  Use-Server-Profile: ${config.use_server_profile ? 'True' : 'False'}
                `,
                inline: true,
              },
              {
                name: 'Embed Style',
                value: stripIndents`
                  Color: ${config.color || interaction.settings.embedColor}
                  Replied-To: ${config.replied_to ? 'True' : 'False'}
                  Attachments-List: ${config.attachments_list ? 'True' : 'False'}
                  Show-Thumbnail: ${config.show_thumbnail ? 'True' : 'False'}
                `,
                inline: true,
              },
            ]);

          return interaction.editReply({ embeds: [mainEmbed] });
        }
      }
    }

    if (subcommandGroup === 'edit') {
      const name = interaction.options.getString('name');
      // check override exists for this server
      const [rows] = await connection.execute(
        /* sql */
        `
          SELECT
            o.id,
            o.name
          FROM
            starboard_overrides o
            JOIN starboards s ON o.starboard_id = s.id
          WHERE
            s.server_id = ?
            AND LOWER(o.name) = LOWER(?)
          LIMIT
            1;
        `,
        [interaction.guild.id, name],
      );

      if (rows.length === 0) {
        return interaction.editReply({ content: `No override named \`${name}\` exists.` });
      }

      const overrideId = rows[0].id;
      const overrideName = rows[0].name; // actual stored casing

      const updates = {};

      switch (subcommand) {
        case 'requirements': {
          const parse = (await import('parse-duration')).default;
          const selfVote = interaction.options.getBoolean('self-vote');
          const threshold = interaction.options.getInteger('threshold');
          const thresholdRemove = interaction.options.getString('threshold-remove');
          const olderThan = interaction.options.getString('older-than');
          const newerThan = interaction.options.getString('newer-than');
          const allowBots = interaction.options.getBoolean('allow-bots');
          const upvoteEmoji = interaction.options.getString('upvote-emoji');
          const requireImage = interaction.options.getBoolean('require-image');
          const downvoteEmoji = interaction.options.getString('downvote-emoji');

          if (threshold) updates.threshold = threshold;

          if (thresholdRemove !== null) {
            if (thresholdRemove.toLowerCase() === 'none') {
              updates.threshold_remove = null;
            } else if (!isNaN(parseInt(thresholdRemove))) {
              const thresholdRemoveUpdate = parseInt(thresholdRemove);

              if (thresholdRemoveUpdate < -10000 || thresholdRemoveUpdate > 10000) {
                await interaction.channel.send(
                  'You provided an invalid threshold remove, it must be between -10,000 and 10,000. It has been skipped.',
                );
              } else {
                updates.threshold_remove = thresholdRemoveUpdate;
              }
            } else {
              await interaction.channel.send(
                'You provided an invalid threshold remove, it must be between -10,000 and 10,000. It has been skipped.',
              );
            }
          }

          if (upvoteEmoji !== null) {
            if (upvoteEmoji.startsWith('<') && upvoteEmoji.endsWith('>')) {
              const emojiId = upvoteEmoji.split(':')[2].slice(0, -1);
              if (!interaction.guild.emojis.cache.has(emojiId)) {
                await interaction.channel.send(
                  'You provided an invalid upvote emoji that is not available in this server, it has been skipped.',
                );
              }
            }
            updates.emoji = upvoteEmoji;
          }

          if (downvoteEmoji !== null) {
            if (downvoteEmoji.toLowerCase() === 'none') {
              updates.downvote_emoji = null;
            } else if (downvoteEmoji.startsWith('<') && downvoteEmoji.endsWith('>')) {
              const emojiId = downvoteEmoji.split(':')[2].slice(0, 1);
              if (!interaction.guild.emojis.cache.has(emojiId)) {
                await interaction.channel.send(
                  'You provided an invalid downvote emoji that is not available in this server, it has been skipped.',
                );
              }
            } else {
              updates.downvote_emoji = downvoteEmoji;
            }
          }

          if (selfVote !== null) updates.self_vote = selfVote;

          if (allowBots !== null) updates.allow_bots = allowBots;

          if (requireImage !== null) updates.require_image = requireImage;

          if (olderThan !== null) {
            const time = parse(olderThan);

            if (time === 0) {
              updates.older_than = null;
            } else {
              updates.older_than = time;
            }
          }

          if (newerThan !== null) {
            const time = parse(newerThan);
            if (time === 0) {
              updates.newer_than = null;
            } else {
              updates.newer_than = time;
            }
          }

          break;
        }

        case 'style': {
          const displayEmoji = interaction.options.getString('display-emoji');
          const pingAuthor = interaction.options.getBoolean('ping-author');
          const extraEmbeds = interaction.options.getBoolean('extra-embeds');
          const useServerProfile = interaction.options.getBoolean('use-server-profile');

          if (displayEmoji !== null) {
            if (displayEmoji.toLowerCase() === 'none') {
              updates.display_emoji = null;
            } else if (displayEmoji.startsWith('<') && displayEmoji.endsWith('>')) {
              const emojiId = displayEmoji.split(':')[2].slice(0, 1);
              if (!interaction.guild.emojis.cache.has(emojiId)) {
                await interaction.channel.send(
                  'You provided an invalid display emoji that is not available in this server, it has been skipped.',
                );
              }
            } else {
              updates.display_emoji = displayEmoji;
            }
          }

          if (pingAuthor !== null) updates.ping_author = pingAuthor;

          if (extraEmbeds !== null) updates.extra_embeds = extraEmbeds;

          if (useServerProfile !== null) updates.use_server_profile = useServerProfile;

          break;
        }

        case 'behavior': {
          const enabled = interaction.options.getBoolean('enabled');
          const autoreactUpvote = interaction.options.getBoolean('autoreact-upvote');
          const autoreactDownvote = interaction.options.getBoolean('autoreact-downvote');
          const linkDeletes = interaction.options.getBoolean('link-deletes');
          const linkEdits = interaction.options.getBoolean('link-edits');
          const removeInvalidReactions = interaction.options.getBoolean('remove-invalid-reactions');

          if (enabled !== null) updates.enabled = enabled;

          if (autoreactUpvote !== null) updates.autoreact_upvote = autoreactUpvote;

          if (autoreactDownvote !== null) updates.autoreact_downvote = autoreactDownvote;

          if (linkDeletes !== null) updates.link_deletes = linkDeletes;

          if (linkEdits !== null) updates.link_edits = linkEdits;

          if (removeInvalidReactions !== null) updates.remove_invalid_reactions = removeInvalidReactions;

          break;
        }

        case 'embed': {
          const color = interaction.options.getString('color');
          const repliedTo = interaction.options.getBoolean('replied-to');
          const showThumbnail = interaction.options.getBoolean('show-thumbnail');
          const attachmentsList = interaction.options.getBoolean('attachments-list');

          if (color !== null) {
            const hexRegex = /(^(#|0x)?([a-fA-F0-9]){6}$)|(^(#|0x)?([a-fA-F0-9]){3}$)/;
            if (!hexRegex.test(color)) {
              await interaction.channel.send(`You provided an invalid hex code for color and it has been skipped.`);
            }

            updates.color = color;
          }

          if (repliedTo !== null) updates.replied_to = repliedTo;

          if (showThumbnail !== null) updates.show_thumbnail = showThumbnail;

          if (attachmentsList !== null) updates.attachments_list = attachmentsList;

          break;
        }
      }

      // if nothing to update
      if (Object.keys(updates).length === 0) {
        return interaction.editReply(`No changes provided for override \`${overrideName}\`.`);
      }

      // build dynamic SET clause
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      values.push(overrideId); // last param for WHERE

      await connection.execute(
        /* sql */ `
          UPDATE starboard_overrides
          SET
            ${fields.join(', ')}
          WHERE
            id = ?
        `,
        values,
      );

      return interaction.editReply(`Updated settings for override \`${overrideName}\`.`);
    }

    if (subcommandGroup === 'channels') {
      const name = interaction.options.getString('name');
      const channel = interaction.options.getChannel('channel');

      // Find the override for this server + name
      const [rows] = await connection.execute(
        /* sql */
        `
          SELECT
            o.id,
            o.name,
            o.channels
          FROM
            starboard_overrides o
            JOIN starboards s ON o.starboard_id = s.id
          WHERE
            s.server_id = ?
            AND LOWER(o.name) = LOWER(?)
          LIMIT
            1
        `,
        [interaction.guild.id, name.toLowerCase()],
      );

      if (rows.length === 0) {
        return interaction.editReply({ content: `No override named \`${name}\` exists.` });
      }

      const override = rows[0];
      let channels = JSON.parse(override.channels || '[]');

      switch (subcommand) {
        case 'add': {
          if (channels.includes(channel.id)) {
            return interaction.editReply(`The channel ${channel} is already in the override and has not been added.`);
          }

          channels.push(channel.id);

          await connection.execute(`UPDATE starboard_overrides SET channels = ? WHERE id = ?`, [
            JSON.stringify(channels),
            override.id,
          ]);

          return interaction.editReply(`Added channel ${channel} to override \`${override.name}\`.`);
        }

        case 'remove': {
          if (!channels.includes(channel.id)) {
            return interaction.editReply(`The channel ${channel} is not in the override and has not been removed.`);
          }

          channels = channels.filter((id) => id !== channel.id);

          await connection.execute(`UPDATE starboard_overrides SET channels = ? WHERE id = ?`, [
            JSON.stringify(channels),
            override.id,
          ]);

          return interaction.editReply(`Removed channel ${channel} from override \`${override.name}\`.`);
        }
      }
    }

    return interaction.editReply('You messed up, how did you even get here?!');
  } catch (error) {
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
