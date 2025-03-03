const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
            option.setName('threshold').setDescription('New emoji threshold (default: 3)').setMinValue(1),
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
                'How old a post must be in order for it to be voted on (e.g. "1 hour"). Use 0 to disable (default: 0)',
              ),
          )
          .addStringOption((option) =>
            option
              .setName('newer-than')
              .setDescription(
                'How new a post must be in order for it to be voted on (e.g. "1 hour"). Use 0 to disable (default: 0)',
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
  try {
    if (interaction.options.getSubcommand() === 'create') {
      const starboards = (await db.get(`servers.${interaction.guild.id}.starboards`)) || {};
      if (!starboards) return interaction.respond([]).catch(() => {});

      const starboardNames = Object.keys(starboards);

      const starboardString = interaction.options.getString('starboard');
      const filtered = starboardNames.filter((name) => name.toLowerCase().includes(starboardString.toLowerCase()));
      if (!filtered) return interaction.respond([]).catch(() => {});

      return interaction
        .respond(
          filtered.slice(0, 25).map((name) => ({
            name,
            value: name,
          })),
        )
        .catch(() => {});
    }

    const overrides = (await db.get(`servers.${interaction.guild.id}.overrides`)) || {};
    const overridesNames = Object.keys(overrides);

    const overridesName = interaction.options.getString('name');
    const filtered = overridesNames.filter((name) => name.toLowerCase().includes(overridesName.toLowerCase()));
    if (!filtered) return interaction.respond([]).catch(() => {});

    return interaction
      .respond(
        filtered.slice(0, 25).map((name) => ({
          name,
          value: name,
        })),
      )
      .catch(() => {});
  } catch (error) {
    return interaction.respond([]).catch(() => {});
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const guildId = interaction.guild.id;
  const starboards = (await db.get(`servers.${guildId}.starboards`)) || {};
  const overrides = (await db.get(`servers.${interaction.guildId}.overrides`)) || {};
  const name = interaction.options.getString('name');
  const starboard = interaction.options.getString('starboard');

  const subcommand = interaction.options.getSubcommand();
  const subcommandGroup = interaction.options.getSubcommandGroup();

  if (!subcommandGroup) {
    switch (subcommand) {
      case 'create': {
        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === starboard.toLowerCase());
        if (!starboards[starKey]) {
          return interaction.editReply({ content: `No starboard named \`${starboard}\` exists.` });
        }

        await db.set(`servers.${interaction.guildId}.overrides.${name}`, {
          starboard: starKey,
          channels: [],
        });

        return interaction.editReply(`The override \`${name}\` has been created for starboard \`${starKey}\``);
      }

      case 'delete': {
        const overridesKey = Object.keys(overrides).find((key) => key.toLowerCase() === name.toLowerCase());
        if (!overrides[overridesKey]) {
          return interaction.editReply({ content: `No override named \`${name}\` exists.` });
        }

        await db.delete(`servers.${interaction.guildId}.overrides.${overridesKey}`);
        return interaction.editReply(`The override \`${overridesKey}\` has been deleted.`);
      }

      case 'view': {
        if (Object.keys(overrides).length === 0) {
          return interaction.editReply('No overrides have been set up yet.');
        }

        const overridesKey = Object.keys(overrides).find((key) => key.toLowerCase() === name.toLowerCase());
        if (!overrides[overridesKey]) {
          return interaction.editReply(`No override named \`${name}\` exists.`);
        }

        const starKey = overrides[overridesKey].starboard;

        const config = { ...starboards[starKey], ...overrides[overridesKey] };
        const { parseMS } = await import('human-ms');

        const mainEmbed = new EmbedBuilder()
          .setTitle(`Override "${name}"`)
          .setColor(config.color || interaction.settings.embedColor)
          .setDescription(
            stripIndents`This override belongs to the starboard '${config.starboard}'.

            This override applies to the following channels: ${config.channels?.map((c) => `<#${c}>`)?.join(', ')}`,
          )
          .setTimestamp()
          .addFields([
            {
              name: 'Requirements',
              value: stripIndents`
                Threshold: ${config.threshold}
                Upvote-Emoji: ${config.emoji}
                Downvote-Emoji: ${config['downvote-emoji'] ? config['downvote-emoji'] : 'None'}
                Self-Vote: ${config['self-vote'] ? 'True' : 'False'}
                Allow-Bots: ${config['allow-bots'] ? 'True' : 'False'}
                Require-Image: ${config['require-image'] ? 'True' : 'False'}
                Older-Than: ${config['older-than'] ? `${parseMS(config['older-than'])}` : 'Disabled'}
                Newer-Than: ${config['newer-than'] ? `${parseMS(config['newer-than'])}` : 'Disabled'}
              `,
              inline: true,
            },
            {
              name: 'Behavior',
              value: stripIndents`
                Enabled: ${config.enabled ? 'True' : 'False'}
                Autoreact-Upvote: ${config['autoreact-upvote'] ? 'True' : 'False'}
                Autoreact-Downvote: ${config['autoreact-downvote'] ? 'True' : 'False'}
                Link-Deletes: ${config['link-deletes'] ? 'True' : 'False'}
                Link-Edits: ${config['link-edits'] ? 'True' : 'False'}
                Remove-Invalid-Reactions: ${config['remove-invalid-reactions'] ? 'True' : 'False'}
              `,
              inline: true,
            },
            {
              name: 'Style',
              value: stripIndents`
                Ping-Author: ${config['ping-author'] ? 'True' : 'False'}
                Extra-Embeds: ${config['extra-embeds'] ? 'True' : 'False'}
                Use-Server-Profile: ${config['use-server-profile'] ? 'True' : 'False'}
              `,
              inline: true,
            },
            {
              name: 'Embed Style',
              value: stripIndents`
                Color: ${config.color || interaction.settings.embedColor}
                Replied-To: ${config['replied-to'] ? 'True' : 'False'}
                Attachments-List: ${config['attachments-list'] ? 'True' : 'False'}
                Show-Thumbnail: ${config['show-thumbnail'] ? 'True' : 'False'}
              `,
              inline: true,
            },
          ]);

        return interaction.editReply({ embeds: [mainEmbed] });
      }
    }
  }

  if (subcommandGroup === 'edit') {
    const overridesKey = Object.keys(overrides).find((key) => key.toLowerCase() === name.toLowerCase());
    if (!overrides[overridesKey]) {
      return interaction.editReply({ content: `No override named \`${name}\` exists.` });
    }

    const updates = {};

    switch (subcommand) {
      case 'requirements': {
        const parse = (await import('parse-duration')).default;
        const selfVote = interaction.options.getBoolean('self-vote');
        const threshold = interaction.options.getInteger('threshold');
        const olderThan = interaction.options.getString('older-than');
        const newerThan = interaction.options.getString('newer-than');
        const allowBots = interaction.options.getBoolean('allow-bots');
        const upvoteEmoji = interaction.options.getString('upvote-emoji');
        const requireImage = interaction.options.getBoolean('require-image');
        const downvoteEmoji = interaction.options.getString('downvote-emoji');

        if (threshold) updates.threshold = threshold;

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
            updates['downvote-emoji'] = null;
          } else if (downvoteEmoji.startsWith('<') && downvoteEmoji.endsWith('>')) {
            const emojiId = downvoteEmoji.split(':')[2].slice(0, 1);
            if (!interaction.guild.emojis.cache.has(emojiId)) {
              await interaction.channel.send(
                'You provided an invalid downvote emoji that is not available in this server, it has been skipped.',
              );
            }
          } else {
            updates['downvote-emoji'] = downvoteEmoji;
          }
        }

        if (selfVote !== null) updates['self-vote'] = selfVote;

        if (allowBots !== null) updates['allow-bots'] = allowBots;

        if (requireImage !== null) updates['require-image'] = requireImage;

        if (olderThan !== null) {
          const time = parse(olderThan);

          if (time === 0) {
            updates['older-than'] = null;
          } else {
            updates['older-than'] = time;
          }
        }

        if (newerThan !== null) {
          const time = parse(newerThan);
          if (time === 0) {
            updates['newer-than'] = null;
          } else {
            updates['newer-than'] = time;
          }
        }

        break;
      }

      case 'style': {
        const pingAuthor = interaction.options.getBoolean('ping-author');
        const extraEmbeds = interaction.options.getBoolean('extra-embeds');
        const useServerProfile = interaction.options.getBoolean('use-server-profile');

        if (pingAuthor !== null) updates['ping-author'] = pingAuthor;

        if (extraEmbeds !== null) updates['extra-embeds'] = extraEmbeds;

        if (useServerProfile !== null) updates['use-server-profile'] = useServerProfile;

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

        if (autoreactUpvote !== null) updates['autoreact-upvote'] = autoreactUpvote;

        if (autoreactDownvote !== null) updates['autoreact-downvote'] = autoreactDownvote;

        if (linkDeletes !== null) updates['link-deletes'] = linkDeletes;

        if (linkEdits !== null) updates['link-edits'] = linkEdits;

        if (removeInvalidReactions !== null) updates['remove-invalid-reactions'] = removeInvalidReactions;

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

        if (repliedTo !== null) updates['replied-to'] = repliedTo;

        if (showThumbnail !== null) updates['show-thumbnail'] = showThumbnail;

        if (attachmentsList !== null) updates['attachments-list'] = attachmentsList;

        break;
      }
    }

    await db.set(`servers.${interaction.guildId}.overrides.${overridesKey}`, {
      ...overrides[overridesKey],
      ...updates,
    });

    return interaction.editReply(`Updated settings for override \`${name}\`.`);
  }

  if (subcommandGroup === 'channels') {
    const name = interaction.options.getString('name');
    const channel = interaction.options.getChannel('channel');

    const overrides = (await db.get(`servers.${interaction.guildId}.overrides`)) || {};

    const overridesKey = Object.keys(overrides).find((key) => key.toLowerCase() === name.toLowerCase());
    const config = overrides[overridesKey];
    if (!config) {
      return interaction.editReply({ content: `No override named \`${name}\` exists.` });
    }

    switch (subcommand) {
      case 'add': {
        const index = config.channels.indexOf(channel.id);

        if (index > -1) {
          return interaction.editReply(`The channel ${channel} is already in the override and has not been added.`);
        } else {
          config.channels.push(channel.id);
        }

        break;
      }

      case 'remove': {
        const index = config.channels.indexOf(channel.id);

        if (index > -1) {
          config.channels.splice(index, 1);
        } else {
          return interaction.editReply(`The channel ${channel} is not in the override and has not been removed.`);
        }

        break;
      }
    }

    await db.set(`servers.${interaction.guildId}.overrides.${overridesKey}`, config);

    return interaction.editReply(`Updated channel settings for override \`${overridesKey}\``);
  }

  return interaction.editReply('You messed up, how did you even get here?!');
};
