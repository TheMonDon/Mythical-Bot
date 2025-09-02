const { SlashCommandBuilder, InteractionContextType, EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const emojiRegex = require('emoji-regex');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('starboards')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Configure aspects of starboards')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a new starboard')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('Name of the starboard')
          .setMinLength(1)
          .setMaxLength(255)
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option.setName('channel').setDescription('The channel to send starred messages to').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Delete a starboard')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('Name of the starboard to delete')
          .setMinLength(1)
          .setMaxLength(255)
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View the server starboards')
      .addStringOption((option) =>
        option.setName('name').setDescription('Name of the starboard to view').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('edit')
      .setDescription("Edit a starboard's setting")
      .addSubcommand((subcommand) =>
        subcommand
          .setName('requirements')
          .setDescription('Edit the requirements for a message to appear on the starboard')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the starboard to edit')
              .setMinLength(1)
              .setMaxLength(255)
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addChannelOption((option) => option.setName('channel').setDescription('New channel for starred messages'))
          .addIntegerOption((option) =>
            option
              .setName('threshold')
              .setDescription('New upvote-emoji threshold (default: 3)')
              .setMinValue(1)
              .setMaxValue(10000),
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
          .setDescription('Edit the general style of the starboard')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the starboard to edit')
              .setMinLength(1)
              .setMaxLength(255)
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('display-emoji')
              .setDescription('The emoji shown next to the number of points on a starboard post. (default: ⭐)'),
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
          .setDescription('Edit how the starboard should behave')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Name of the starboard to edit')
              .setMinLength(1)
              .setMaxLength(255)
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
              .setDescription('Name of the starboard to edit')
              .setMinLength(1)
              .setMaxLength(255)
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option.setName('color').setDescription('New color of the embed (default: server embed color)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('replied-to')
              .setDescription('Whether to include the message that was replied to (default: true)'),
          )
          .addBooleanOption((option) =>
            option
              .setName('attachments-list')
              .setDescription('Whether to list the names (as hyperlinks) of uploaded attachments. (default: true)'),
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

    const choices = rows.map((r) => ({ name: r.name, value: r.name }));
    await interaction.respond(choices).catch(() => {});
  } catch (error) {
    return interaction.respond([]).catch(() => {});
  } finally {
    connection.release();
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();

  try {
    const [starboards] = await connection.query(
      /* sql */ `
        SELECT
          *
        FROM
          starboards
        WHERE
          server_id = ?
      `,
      [interaction.guild.id],
    );

    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();

    if (!subcommandGroup) {
      switch (subcommand) {
        case 'create': {
          const name = interaction.options.getString('name');
          const channel = interaction.options.getChannel('channel');

          // Check max starboards
          if (starboards.length >= 3) {
            return interaction.editReply(
              'This server has reached the maximum number of starboards available (3). Please delete one before making a new one.',
            );
          }

          // Check if a starboard with this name already exists (case-insensitive)
          const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            return interaction.editReply(`A starboard named \`${name}\` already exists!`);
          }

          if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply(
              'I need permission to view and send messages in that channel. Please re-run the command when this is fixed.',
            );
          }

          await connection.execute(
            /* sql */ `
              INSERT INTO
                starboards (
                  server_id,
                  name,
                  enabled,
                  channel_id,
                  threshold,
                  threshold_remove,
                  color,
                  emoji,
                  display_emoji,
                  downvote_emoji,
                  allow_bots,
                  self_vote,
                  ping_author,
                  replied_to,
                  link_deletes,
                  link_edits,
                  autoreact_upvote,
                  autoreact_downvote,
                  remove_invalid_reactions,
                  require_image,
                  extra_embeds,
                  use_server_profile,
                  show_thumbnail,
                  older_than,
                  newer_than,
                  attachments_list
                )
              VALUES
                (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?
                ) ON DUPLICATE KEY
              UPDATE enabled =
              VALUES
                (enabled),
                channel_id =
              VALUES
                (channel_id),
                threshold =
              VALUES
                (threshold),
                threshold_remove =
              VALUES
                (threshold_remove),
                color =
              VALUES
                (color),
                emoji =
              VALUES
                (emoji),
                display_emoji =
              VALUES
                (display_emoji),
                downvote_emoji =
              VALUES
                (downvote_emoji),
                allow_bots =
              VALUES
                (allow_bots),
                self_vote =
              VALUES
                (self_vote),
                ping_author =
              VALUES
                (ping_author),
                replied_to =
              VALUES
                (replied_to),
                link_deletes =
              VALUES
                (link_deletes),
                link_edits =
              VALUES
                (link_edits),
                autoreact_upvote =
              VALUES
                (autoreact_upvote),
                autoreact_downvote =
              VALUES
                (autoreact_downvote),
                remove_invalid_reactions =
              VALUES
                (remove_invalid_reactions),
                require_image =
              VALUES
                (require_image),
                extra_embeds =
              VALUES
                (extra_embeds),
                use_server_profile =
              VALUES
                (use_server_profile),
                show_thumbnail =
              VALUES
                (show_thumbnail),
                older_than =
              VALUES
                (older_than),
                newer_than =
              VALUES
                (newer_than),
                attachments_list =
              VALUES
                (attachments_list)
            `,
            [
              interaction.guild.id,
              name,
              true,
              channel.id,
              3, // threshold
              0, // threshold_remove
              interaction.settings.embedColor, // color
              '⭐', // emoji
              '⭐', // display_emoji
              null, // downvote_emoji
              true, // allow_bots
              false, // self_vote
              false, // ping_author
              true, // replied_to
              false, // link_deletes
              true, // link_edits
              true, // autoreact_upvote
              true, // autoreact_downvote
              true, // remove_invalid_reactions
              false, // require_image
              true, // extra_embeds
              true, // use_server_profile
              true, // show_thumbnail
              null, // older_than
              null, // newer_than
              true, // attachments_list
            ],
          );

          return interaction.editReply(`Created starboard \`${name}\` in ${channel}.`);
        }

        case 'delete': {
          const name = interaction.options.getString('name');

          const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (!existing) {
            return interaction.editReply(`No starboard named \`${name}\` exists.`);
          }

          await connection.execute(
            /* sql */ `
              DELETE FROM starboards
              WHERE
                id = ?
            `,
            [existing.id],
          );

          return interaction.editReply(`Deleted starboard \`${name}\`.`);
        }

        case 'view': {
          if (starboards.length === 0) {
            return interaction.editReply('No starboards have been set up yet.');
          }

          const name = interaction.options.getString('name');

          const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (!existing) {
            return interaction.editReply(`No starboard named \`${name}\` exists.`);
          }

          const config = existing;
          const { parseMS } = await import('human-ms');

          const mainEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            .setTitle(`Starboard "${existing.name}"`)
            .setColor(config.color || interaction.settings.embedColor)
            .setDescription(`This starboard is in <#${config.channel_id}>.`)
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

      const existing = starboards.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (!existing) {
        return interaction.editReply(`No starboard named \`${name}\` exists.`);
      }

      function isValidStarboardEmoji(content) {
        content = content.trim();

        const regex = emojiRegex();
        const matches = [...content.matchAll(regex)];

        return matches.length === 1 && matches[0][0] === content;
      }

      const updates = {};

      switch (subcommand) {
        case 'requirements': {
          const parse = (await import('parse-duration')).default;
          const channel = interaction.options.getChannel('channel');
          const selfVote = interaction.options.getBoolean('self-vote');
          const threshold = interaction.options.getInteger('threshold');
          const thresholdRemove = interaction.options.getString('threshold-remove');
          const olderThan = interaction.options.getString('older-than');
          const newerThan = interaction.options.getString('newer-than');
          const allowBots = interaction.options.getBoolean('allow-bots');
          const upvoteEmoji = interaction.options.getString('upvote-emoji');
          const requireImage = interaction.options.getBoolean('require-image');
          const downvoteEmoji = interaction.options.getString('downvote-emoji');

          if (channel !== null) {
            if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
              return interaction.editReply('I need permission to send messages in that channel.');
            }
            updates.channel_id = channel.id;
          }

          if (threshold !== null) {
            if (!isNaN(parseInt(thresholdRemove))) {
              const thresholdUpdate = parseInt(threshold);

              if (thresholdUpdate < 1 || thresholdUpdate > 10000) {
                await interaction.channel.send(
                  'You provided an invalid threshold, it must be between 1 and 10,000. It has been skipped.',
                );
              } else {
                updates.threshold_remove = thresholdUpdate;
              }
            } else {
              await interaction.channel.send(
                'You provided an invalid threshold, it must be between 1 and 10,000. It has been skipped.',
              );
            }
          }

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
                const thresholdToCheck = updates.threshold ?? existing.threshold;

                if (thresholdToCheck !== null && thresholdRemoveUpdate >= thresholdToCheck) {
                  await interaction.channel.send('Threshold-remove must be less than threshold. It has been skipped.');
                } else {
                  updates.threshold_remove = thresholdRemoveUpdate;
                }
              }
            } else {
              await interaction.channel.send(
                'You provided an invalid threshold remove, it must be between -10,000 and 10,000. It has been skipped.',
              );
            }
          }

          if (upvoteEmoji !== null) {
            if (!isValidStarboardEmoji(upvoteEmoji)) {
              await interaction.channel.send(
                'You provided an invalid upvote-emoji, it must be a single default emoji. It has been skipped.',
              );
            } else {
              updates.emoji = upvoteEmoji;
            }
          }

          if (downvoteEmoji !== null) {
            if (downvoteEmoji.toLowerCase() === 'none') {
              updates.downvote_emoji = null;
            } else if (!isValidStarboardEmoji(downvoteEmoji)) {
              await interaction.channel.send(
                'You provided an invalid downvote-emoji, it must be a single default emoji. It has been skipped.',
              );
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
            } else if (!isValidStarboardEmoji(displayEmoji)) {
              await interaction.channel.send(
                'You provided an invalid display-emoji, it must be a single default emoji. It has been skipped.',
              );
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
              await interaction.channel.send(
                'You provided an invalid hex code for the color option. It has been skipped.',
              );
            } else {
              updates.color = color;
            }
          }

          if (repliedTo !== null) updates.replied_to = repliedTo;

          if (showThumbnail !== null) updates.show_thumbnail = showThumbnail;

          if (attachmentsList !== null) updates.attachments_list = attachmentsList;

          break;
        }
      }

      if (Object.keys(updates).length > 0) {
        const fields = Object.keys(updates)
          .map((key) => `${key} = ?`)
          .join(', ');

        const values = Object.values(updates);

        await connection.query(
          /* sql */ `
            UPDATE starboards
            SET
              ${fields}
            WHERE
              server_id = ?
              AND LOWER(name) = LOWER(?)
          `,
          [...values, interaction.guildId, name],
        );
      }

      return interaction.editReply(`Updated settings for starboard \`${name}\`.`);
    }

    return interaction.editReply('You messed up, how did you get here?!');
  } catch (error) {
    return interaction.client.util.errorEmbed(interaction, error.message);
  } finally {
    connection.release();
  }
};
