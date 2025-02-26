const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const amountText = 'The amount of messages to delete';
const delText = 'The text to delete';

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('purge')
  .setContexts(InteractionContextType.Guild)
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
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
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
      .addStringOption((option) =>
        option.setName('message_id').setDescription('The message ID to start from').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('before')
      .setDescription('Delete messages before a message ID')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription(amountText).setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('message_id').setDescription('The message ID to end at').setRequired(true),
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

  let amount = interaction.options.getInteger('amount') + 1;
  const subcommand = interaction.options.getSubcommand();
  const text = interaction.options.getString('text');
  const messageId = interaction.options.getString('message_id');
  const inviteRegex = /discord\.(gg|me|io|li|com\/invite)\s?\//gi;
  const linkRegex = /https?:\/\/[\w\d-._~:/?#[\]@!$&'()*+,;=%]+/gi;

  if (!interaction.guild.members.me.permissions.has('ManageMessages')) {
    return interaction.editReply('The bot needs `Manage Messages` permission.');
  }

  // Fetch the original interaction message
  const originalMessage = await interaction.fetchReply();

  async function getMessages(channel, limit, filter, before, after) {
    if (limit > 100) limit = 100;
    return channel.messages.fetch({ limit, before, after }).then((messages) => {
      // Filter out the original interaction message
      const filteredMessages = messages.filter((m) => m.id !== originalMessage.id);
      return filter ? filteredMessages.filter(filter) : filteredMessages;
    });
  }

  async function deleteMessages(channel, messages) {
    if (!messages || messages.size < 1) return 0;

    return channel
      .bulkDelete(messages, true)
      .then((deletedMessages) => deletedMessages.size)
      .catch((err) => {
        console.error(err);
        return 0;
      });
  }

  let resultMessage = '';
  switch (subcommand) {
    case 'any': {
      amount = amount - 1;
      const total = Number(amount);
      let purged = 0;
      const progress = amount > 100;

      if (amount < 100) {
        const filter = (element) => !element.pinned;
        const messages = await getMessages(interaction.channel, amount, filter);
        const size = await deleteMessages(interaction.channel, messages);
        resultMessage = `Successfully deleted ${size} messages.`;
        break;
      }

      const purgeText = progress ? 'Purging messages... 0%' : 'Purging messages...';
      await interaction.editReply(purgeText);

      while (amount > 0) {
        let messages = [];
        try {
          messages = await getMessages(
            interaction.channel,
            Math.min(amount, 100),
            (m) => !m.pinned,
            originalMessage.id,
          );
        } catch (e) {
          return console.error('Unable to get messages:', e);
        }

        // Keep track of how many messages were actually deleted
        const deletedCount = await deleteMessages(interaction.channel, messages);
        purged += deletedCount;

        if (progress)
          interaction.editReply(`Purging messages... ${Math.ceil((purged / total) * 100)}%`).catch(() => false);
        if (!messages.size) amount = 0;

        await interaction.client.util.wait(1100);
        amount -= Math.min(amount, 100);
      }

      resultMessage = `Purged ${purged} messages.`;
      break;
    }

    case 'user': {
      const user = interaction.options.getUser('user');
      const filter = (m) => m.author.id === user.id;
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages from ${user.tag}.`;
      break;
    }

    case 'links': {
      const filter = (m) => linkRegex.test(m.content);
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages containing links.`;
      break;
    }

    case 'invites': {
      const filter = (m) => inviteRegex.test(m.content);
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages containing invites.`;
      break;
    }

    case 'match': {
      const filter = (m) => m.content.toLowerCase().includes(text.toLowerCase());
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages containing "${text}".`;
      break;
    }

    case 'not': {
      const filter = (m) => !m.content.toLowerCase().includes(text.toLowerCase());
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages not containing "${text}".`;
      break;
    }

    case 'startswith': {
      const filter = (m) => m.content.toLowerCase().startsWith(text.toLowerCase());
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages starting with "${text}".`;
      break;
    }

    case 'endswith': {
      const filter = (m) => m.content.toLowerCase().endsWith(text.toLowerCase());
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages ending with "${text}".`;
      break;
    }

    case 'bots': {
      const filter = (m) => m.author.bot;
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages from bots.`;
      break;
    }

    case 'humans': {
      const filter = (m) => !m.author.bot;
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages from humans.`;
      break;
    }

    case 'images': {
      const filter = (m) => m.attachments.size > 0;
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages containing images.`;
      break;
    }

    case 'after': {
      const messages = await getMessages(interaction.channel, amount, null, null, messageId);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages after ${messageId}.`;
      break;
    }

    case 'before': {
      const messages = await getMessages(interaction.channel, amount, null, messageId);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages before ${messageId}.`;
      break;
    }

    case 'mentions': {
      const filter = (m) => m.mentions.users.size > 0;
      const messages = await getMessages(interaction.channel, amount, filter);
      const size = await deleteMessages(interaction.channel, messages);
      resultMessage = `Successfully deleted ${size} messages containing mentions.`;
      break;
    }

    default:
      resultMessage = 'Invalid subcommand.';
      break;
  }

  await interaction.editReply(resultMessage);
};
