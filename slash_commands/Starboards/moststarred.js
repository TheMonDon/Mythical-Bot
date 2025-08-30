const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');

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
  const connection = await interaction.client.db.getConnection();

  const name = interaction.options.getString('name');
  const author = interaction.options.getUser('author');
  const channel = interaction.options.getChannel('channel');

  try {
    const [starboardRows] = await connection.execute(
      /* sql */
      `
        SELECT
          id,
          name,
          channel_id
        FROM
          starboards
        WHERE
          server_id = ?
          AND LOWER(name) = LOWER(?)
        LIMIT
          1
      `,
      [interaction.guild.id, name.toLowerCase()],
    );

    if (starboardRows.length === 0) {
      return interaction.reply({
        content: `No starboard named \`${name}\` exists.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const starboard = starboardRows[0];
    const starChannel = interaction.guild.channels.cache.get(starboard.channel_id);

    if (!starChannel) {
      return interaction.reply({ content: 'Starboard channel not found.', flags: MessageFlags.Ephemeral });
    }

    if (starChannel.nsfw) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } else {
      await interaction.deferReply();
    }

    let query = /* sql */ `
      SELECT
        original_msg_id AS msgId,
        starboard_msg_id,
        stars,
        author_id,
        channel_id
      FROM
        starboard_messages
      WHERE
        starboard_id = ?
    `;
    const params = [starboard.id];

    if (author) {
      query += ` AND author_id = ?`;
      params.push(author.id);
    }
    if (channel) {
      query += ` AND channel_id = ?`;
      params.push(channel.id);
    }

    const [messageRows] = await connection.execute(query, params);

    if (messageRows.length === 0) {
      return interaction.editReply('No matching starred messages found.');
    }

    const sortedMessages = messageRows.sort((a, b) => b.stars - a.stars);

    if (sortedMessages.length === 0) {
      return interaction.editReply({ content: 'No starred messages found.' });
    }

    let page = 0;

    const generateEmbed = async (page) => {
      const messageData = sortedMessages[page];
      if (!messageData) return null;

      const starboardMsg = await starChannel.messages.fetch(messageData.starboard_msg_id).catch(() => null);
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
      return interaction.editReply({ content: 'No valid messages to display.' });
    }

    await interaction.editReply({ embeds, components: [row], ephemeral: starChannel.nsfw });
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

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
  } catch (error) {
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
