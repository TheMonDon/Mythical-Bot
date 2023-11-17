const { SlashCommandBuilder } = require('discord.js');
const amountText = 'The amount of messages to delete';
const delText = 'The text to delete';

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('purge')
  .setDMPermission(false)
  .setDescription('Purge messages')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('any')
      .setDescription('Delete any message type')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(1000).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('user')
      .setDescription('Delete messages from a user')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to delete messages from').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('links')
      .setDescription('Delete messages containing links')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('invites')
      .setDescription('Delete messages containing invites')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(1000).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('match')
      .setDescription('Delete messages matching text')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addStringOption((option) => option.setName('text').setDescription(delText).setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('not')
      .setDescription('Delete messages not matching text')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addStringOption((option) => option.setName('text').setDescription(delText).setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('startswith')
      .setDescription('Delete messages starting with text')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addStringOption((option) => option.setName('text').setDescription(delText).setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('endswith')
      .setDescription('Delete messages ending with text')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addStringOption((option) => option.setName('text').setDescription(delText).setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('bots')
      .setDescription('Delete messages from bots')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('humans')
      .setDescription('Delete messages from humans')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('images')
      .setDescription('Delete messages containing images')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('after')
      .setDescription('Delete messages after a message ID')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addIntegerOption((option) =>
        option.setName('message_id').setDescription(amountText).setMinValue(1).setMaxValue(30).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('before')
      .setDescription('Delete messages before a message ID')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addIntegerOption((option) =>
        option.setName('message_id').setDescription(amountText).setMinValue(1).setMaxValue(30).setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('mentions')
      .setDescription('Delete messages containing mentions')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const amount = interaction.options.getInteger('amount');
  const subcommand = interaction.options.getSubcommand();
  const text = interaction.options.getString('text');
  const inviteRegex = /discord.(gg|me)\s?\//gi;
  const linkRegex = /https?:\/\/[\w\d-_]/gi;

  if (interaction.guild && !interaction.guild.members.me.permissions.has('ManageMessages'))
    return interaction.client.util.errorEmbed(
      interaction,
      'The bot needs `Manage Messages` permission.',
      'Missing Permission',
    );

  // Global function to get messages
  // channel: Channel object
  // limit: Number of messages to fetch
  // filter: Function to filter messages
  async function getMessages(channel, limit, filter, before, after, filterLimit) {
    return await channel.messages
      .fetch({
        limit,
        before,
        after,
      })
      .then((messages) => {
        if (filter) messages = messages.filter(filter);
        return messages;
      });
  }

  // Global function to delete messages
  // msg: Message object
  // messages: Collection of messages to delete
  async function deleteMessages(channel, messages) {
    if (!messages || messages.size < 1) return interaction.editReply('No messages found.');

    return await channel
      .bulkDelete(messages, true)
      .then(async (messages) => {
        return messages.size;
      })
      .catch((err) => {
        return interaction.client.util.errorEmbed(interaction, err);
      });
  }

  switch (subcommand) {
    case 'any': {
      const total = interaction.options.getInteger('amount');
      let purged = 0;
      let count;
      const progress = count > 100;

      if (count < 100) {
        const filter = function (element) {
          return !element.pinned;
        };
        const messages = await getMessages(interaction.channel, count, filter);
        const size = await deleteMessages(interaction.channel, messages);
        return interaction.editReply(`Successfully deleted ${size} messages in current channel.`);
      }

      const purgeText = progress ? 'Purging messages... 0%' : 'Purging messages...';
      const purgeMsg = await interaction.channel.send(purgeText);

      while (count > 0) {
        let messages = [];

        try {
          messages = await getMessages(interaction.channel, Math.min(count, 100), (m) => !m.pinned);
        } catch (e) {
          return this.error('Unable to get messages.');
        }

        await deleteMessages(interaction.channel, messages);

        purged += messages.size;

        if (progress) purgeMsg.edit(`Purging messages... ${Math.ceil((purged / total) * 100)}%`).catch(() => false);
        if (!messages.size) count = 0;

        await interaction.client.util.wait(1100);
        count -= Math.min(count, 100);
      }

      purgeMsg.edit(`Purged ${purged} messages.`).catch(() => false);
      setTimeout(() => purgeMsg.delete().catch(() => false), 9000);
      break;
    }

    case 'user': {
      const user = interaction.options.getUser('user');
      const filter = function (element) {
        return element.author.id === user.id;
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found from that member.');

      const size = await deleteMessages(interaction.channel, messages);
      const authorName = user.user.discriminator === '0' ? user.user.username : user.user.tag;
      return interaction.editReply(`Successfully deleted ${size} messages from ${authorName}.`);
    }

    case 'links': {
      const filter = function (element) {
        return element.content.match(linkRegex);
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found containing links.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages containing links.`);
    }

    case 'invites': {
      const filter = function (element) {
        return element.content.match(inviteRegex);
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found containing invites.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages containing invites.`);
    }

    case 'match': {
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (const match of text) {
          if (content.includes(match.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(interaction.channel, amount, filter);
      console.log('Messages stuff', messages.first(2));

      if (!messages || messages.size < 1) return interaction.editReply(`No messages found containing \`${text}\`.`);

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages containing \`${text}\`.`);
    }

    case 'not': {
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (const match of text) {
          if (!content.includes(match.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1)
        return interaction.channel.send(`No messages found not containing \`${text}\`.`);

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages not containing \`${text}\`.`);
    }

    case 'startswith': {
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (const match of text) {
          if (content.startsWith(match.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1) return interaction.editReply(`No messages found starting with \`${text}\`.`);

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages starting with \`${text}\`.`);
    }

    case 'endswith': {
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (const match of text) {
          if (content.endsWith(match.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1) return interaction.editReply(`No messages found ending with \`${text}\`.`);

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages ending with \`${text}\`.`);
    }

    case 'bot': {
      const filter = function (element) {
        return element.author.bot;
      };
      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1) return interaction.editReply('No messages found from bots.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages from bots.`);
    }

    case 'humans': {
      const filter = function (element) {
        return !element.author.bot;
      };
      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1) return interaction.editReply('No messages found from humans.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages from humans.`);
    }

    case 'images': {
      const filter = function (element) {
        return element.attachments?.size || element.embeds?.size;
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found with images.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages with images.`);
    }

    case 'before': {
      const messageId = interaction.options.getInteger('message_id');
      const message = await interaction.channel.messages.fetch(messageId);
      if (!message) return interaction.editReply('Message not found.');

      const filter = function (element) {
        return element.createdTimestamp < message.createdTimestamp;
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found before the message.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages before the message.`);
    }

    case 'after': {
      const messageId = interaction.options.getInteger('message_id');
      const message = await interaction.channel.messages.fetch(messageId);
      if (!message) return interaction.editReply('No message with that ID was found.');

      const filter = function (element) {
        return element.createdTimestamp > message.createdTimestamp;
      };
      const messages = await getMessages(interaction.channel, amount, filter);

      if (!messages || messages.size < 1) return interaction.editReply('No messages found after the message.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages after the message.`);
    }

    case 'mentions': {
      const filter = function (element) {
        return element.mentions.members.size || element.mentions.roles.size;
      };
      const messages = await getMessages(interaction.channel, amount, filter);
      if (!messages || messages.size < 1) return interaction.editReply('No messages found with mentions.');

      const size = await deleteMessages(interaction.channel, messages);
      return interaction.editReply(`Successfully deleted ${size} messages with mentions.`);
    }
  }
};
