const { SlashCommandBuilder, InteractionContextType, EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('starboard')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Configure starboard systems')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a new starboard')
      .addStringOption((option) => option.setName('name').setDescription('Name of the starboard').setRequired(true))
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
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addChannelOption((option) => option.setName('channel').setDescription('New channel for starred messages'))
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
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addBooleanOption((option) =>
            option
              .setName('ping-author')
              .setDescription('Whether to mention the author of the original message (default: false)'),
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
          ),
      ),
  );

exports.autoComplete = async (interaction) => {
  try {
    const nameString = interaction.options.getString('name');

    // Fetch starboards for the server
    const starboards = (await db.get(`servers.${interaction.guild.id}.starboards`)) || {};

    // Get starboard names
    const starboardNames = Object.keys(starboards);

    // Filter based on user input
    const filtered = starboardNames.filter((name) => name.toLowerCase().includes(nameString.toLowerCase()));

    // Respond with up to 25 choices (Discord API limit)
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
  const subcommand = interaction.options.getSubcommand();
  const subcommandGroup = interaction.options.getSubcommandGroup();

  const guildPremium = (await db.get(`servers.${interaction.guild.id}.premium`)) || false;
  if (!guildPremium) {
    return interaction.editReply('This command is currently in beta and requires a premium server to use.');
  }

  const starboards = (await db.get(`servers.${interaction.guildId}.starboards`)) || {};

  if (!subcommandGroup) {
    switch (subcommand) {
      case 'create': {
        const name = interaction.options.getString('name');
        const channel = interaction.options.getChannel('channel');

        if (Object.keys(starboards).length > 2) {
          return interaction.editReply(
            'The server has reached the maximum number of starboards available (3). Please delete one before making a new one.',
          );
        }

        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
        if (starboards[starKey]) {
          return interaction.editReply(`A starboard named "${name}" already exists!`);
        }

        if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
          return interaction.editReply('I need permission to send messages in that channel.');
        }

        await db.set(`servers.${interaction.guildId}.starboards.${name}`, {
          enabled: true,
          channelId: channel.id,
          threshold: 3,
          color: interaction.settings.embedColor,
          emoji: '⭐',
          'downvote-emoji': null,
          'allow-bots': true,
          'self-vote': false,
          'ping-author': false,
          'replied-to': true,
          'link-deletes': false,
          'link-edits': true,
          'autoreact-upvote': true,
          'autoreact-downvote': true,
          'remove-invalid-reactions': true,
          'require-image': false,
          messages: {},
        });

        return interaction.editReply(`Created starboard "${name}" in ${channel}.`);
      }

      case 'delete': {
        const name = interaction.options.getString('name');

        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
        if (!starboards[starKey]) {
          return interaction.editReply(`No starboard named "${name}" exists.`);
        }

        await db.delete(`servers.${interaction.guildId}.starboards.${starKey}`);
        return interaction.editReply(`Deleted starboard "${name}".`);
      }

      case 'view': {
        if (Object.keys(starboards).length === 0) {
          return interaction.editReply('No starboards have been set up yet.');
        }

        const name = interaction.options.getString('name');

        const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
        if (!starboards[starKey]) {
          return interaction.editReply(`No starboard named "${name}" exists.`);
        }

        const config = starboards[starKey];

        const mainEmbed = new EmbedBuilder()
          .setTitle(`Starboard "${name}"`)
          .setColor(config.color || interaction.settings.embedColor)
          .setDescription(`This starboard is in <#${config.channelId}>.`)
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
              `,
              inline: true,
            },
            {
              name: 'Embed Style',
              value: stripIndents`
                Color: ${config.color || interaction.settings.embedColor}
                Replied-To: ${config['replied-to'] ? 'True' : 'False'}
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

    const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
    if (!starboards[starKey]) {
      return interaction.editReply(`No starboard named "${name}" exists.`);
    }

    const updates = {};

    switch (subcommand) {
      case 'requirements': {
        const channel = interaction.options.getChannel('channel');
        const selfVote = interaction.options.getBoolean('self-vote');
        const threshold = interaction.options.getInteger('threshold');
        const allowBots = interaction.options.getBoolean('allow-bots');
        const upvoteEmoji = interaction.options.getString('upvote-emoji');
        const requireImage = interaction.options.getBoolean('require-image');
        const downvoteEmoji = interaction.options.getString('downvote-emoji');

        if (channel !== null) {
          if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply('I need permission to send messages in that channel.');
          }
          updates.channelId = channel.id;
        }

        if (threshold) updates.threshold = threshold;

        if (upvoteEmoji !== null) {
          if (upvoteEmoji.startsWith('<') && upvoteEmoji.endsWith('>')) {
            const emojiId = upvoteEmoji.split(':')[2].slice(0, -1);
            if (!interaction.guild.emojis.cache.has(emojiId)) {
              return interaction.editReply('That emoji is not available in this server.');
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
              return interaction.editReply('That downvote emoji is not available in this server.');
            }
          } else {
            updates['downvote-emoji'] = downvoteEmoji;
          }
        }

        if (selfVote !== null) {
          updates['self-vote'] = selfVote;
        }

        if (allowBots !== null) {
          updates['allow-bots'] = allowBots;
        }

        if (requireImage !== null) {
          updates['require-image'] = requireImage;
        }

        break;
      }

      case 'style': {
        const pingAuthor = interaction.options.getBoolean('ping-author');

        if (pingAuthor !== null) {
          updates['ping-author'] = pingAuthor;
        }

        break;
      }

      case 'behavior': {
        const enabled = interaction.options.getBoolean('enabled');
        const autoreactUpvote = interaction.options.getBoolean('autoreact-upvote');
        const autoreactDownvote = interaction.options.getBoolean('autoreact-downvote');
        const linkDeletes = interaction.options.getBoolean('link-deletes');
        const linkEdits = interaction.options.getBoolean('link-edits');
        const removeInvalidReactions = interaction.options.getBoolean('remove-invalid-reactions');

        if (enabled !== null) {
          updates.enabled = enabled;
        }

        if (autoreactUpvote !== null) {
          updates['autoreact-upvote'] = autoreactUpvote;
        }

        if (autoreactDownvote !== null) {
          updates['autoreact-downvote'] = autoreactDownvote;
        }

        if (linkDeletes !== null) {
          updates['link-deletes'] = linkDeletes;
        }

        if (linkEdits !== null) {
          updates['link-edits'] = linkEdits;
        }

        if (removeInvalidReactions !== null) {
          updates['remove-invalid-reactions'] = removeInvalidReactions;
        }

        break;
      }

      case 'embed': {
        const color = interaction.options.getString('color');
        const repliedTo = interaction.options.getBoolean('replied-to');

        if (color !== null) {
          const hexRegex = /(^(#|0x)?([a-fA-F0-9]){6}$)|(^(#|0x)?([a-fA-F0-9]){3}$)/;
          if (!hexRegex.test(color)) {
            return interaction.editReply('Please provide a valid hex code for color.');
          }

          updates.color = color;
        }

        if (repliedTo !== null) {
          updates['replied-to'] = repliedTo;
        }

        break;
      }
    }

    await db.set(`servers.${interaction.guildId}.starboards.${starKey}`, {
      ...starboards[starKey],
      ...updates,
    });

    return interaction.editReply(`Updated settings for starboard "${name}".`);
  }

  return interaction.editReply('You messed up, how did you get here?!');
};
