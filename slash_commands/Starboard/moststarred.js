const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('moststarred')
  .setDescription('Shows the most starred messages in this server')
  .addStringOption((option) =>
    option.setName('name').setDescription('The name of the starboard').setRequired(true).setAutocomplete(true),
  )
  .addUserOption((option) => option.setName('author').setDescription('Filter by message author').setRequired(false))
  .addChannelOption((option) => option.setName('channel').setDescription('Filter by channel').setRequired(false));

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
  const guildId = interaction.guild.id;
  const starboards = (await db.get(`servers.${guildId}.starboards`)) || {};
  const name = interaction.options.getString('name');

  const starKey = Object.keys(starboards).find((key) => key.toLowerCase() === name.toLowerCase());
  if (!starboards[starKey]) {
    return interaction.reply({
      content: `No starboard named "${name}" exists.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const config = starboards[starKey];
  const starChannel = interaction.guild.channels.cache.get(config.channelId);
  if (!starChannel) {
    return interaction.editReply({ content: 'Starboard channel not found.', flags: MessageFlags.Ephemeral });
  }

  const messages = (await db.get(`servers.${guildId}.starboards.${name}.messages`)) || {};
  const sortedMessages = Object.entries(messages).sort((a, b) => b[1].stars - a[1].stars);

  if (sortedMessages.length === 0) {
    return interaction.editReply({ content: 'No starred messages found.', flags: MessageFlags.Ephemeral });
  }

  let page = 0;

  const generateEmbed = async (page) => {
    const [msgId, data] = sortedMessages[page] || [];
    if (!msgId || !data) return null;

    const starboardMsg = await starChannel.messages.fetch(data.starboardMsgId).catch(() => null);
    return starboardMsg ? starboardMsg.embeds : null;
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder()
      .setCustomId('page')
      .setLabel(`Page ${page + 1}/${sortedMessages.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(sortedMessages.length <= 1),
  );

  const embeds = await generateEmbed(page);
  if (!embeds) {
    return interaction.editReply({ content: 'No valid messages to display.', flags: MessageFlags.Ephemeral });
  }

  await interaction.editReply({ embeds, components: [row] });
  const reply = await interaction.fetchReply();

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'These buttons are not for you.', flags: MessageFlags.Ephemeral });
    }

    if (i.customId === 'prev' && page > 0) page--;
    if (i.customId === 'next' && page < sortedMessages.length - 1) page++;

    const updatedEmbeds = await generateEmbed(page);
    if (!updatedEmbeds) return;

    row.components[0].setDisabled(page === 0);
    row.components[1].setLabel(`Page ${page + 1}/${sortedMessages.length}`);
    row.components[2].setDisabled(page >= sortedMessages.length - 1);

    await i.update({ embeds: updatedEmbeds, components: [row] });
  });

  collector.on('end', async () => {
    row.components[0].setDisabled(true);
    row.components[2].setDisabled(true);

    await interaction.editReply({ components: [row] });
  });
};
