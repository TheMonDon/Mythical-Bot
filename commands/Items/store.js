const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');

class Store extends Command {
  constructor(client) {
    super(client, {
      name: 'store',
      description: 'View the items available for purchase.',
      category: 'Items',
      examples: ['store [page]'],
      aliases: ['shop'],
      usage: 'store [page]',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = parseInt(args.join(' ')) || 1;
    const itemsPerPage = 10;

    if (isNaN(page)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          symbol
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';

    // Get total item count to calculate max pages
    const [countRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          COUNT(*) AS count
        FROM
          economy_store
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const totalItems = countRows[0].count;
    const maxPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (page > maxPages) page = maxPages;
    if (page < 1) page = 1;

    const generateStoreEmbed = async (currentPage) => {
      const offset = (currentPage - 1) * itemsPerPage;

      // Fetch only the items for the current page, sorted by cost
      const [rows] = await this.client.db.execute(
        /* sql */
        `
          SELECT
            item_name,
            cost,
            description
          FROM
            economy_store
          WHERE
            server_id = ?
          ORDER BY
            cost ASC
          LIMIT
            ?
          OFFSET
            ?
        `,
        [msg.guild.id, itemsPerPage, offset],
      );

      const embed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} Store`)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
        .setTimestamp();

      if (rows.length === 0) {
        embed.setDescription(stripIndents`
          The store is empty. Someone probably robbed it :shrug:
          Add items to the store using \`${msg.settings.prefix}create-item\``);
      } else {
        const fields = rows.map((item) => {
          const formattedCost = currencySymbol + BigInt(item.cost).toLocaleString();
          return {
            name: `${this.client.util.limitStringLength(formattedCost, 0, 100)} - ${item.item_name}`,
            value: item.description || 'No description provided.',
            inline: false,
          };
        });
        embed.addFields(fields);
      }

      return embed;
    };

    // Initial Send
    const embed = await generateStoreEmbed(page);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === maxPages),
    );

    const message = await msg.channel.send({ embeds: [embed], components: [row] });

    // Button Collector
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3600000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      const updatedEmbed = await generateStoreEmbed(page);
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === maxPages),
      );

      await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
      );
      message.edit({ components: [disabledRow] }).catch(() => null);
    });
  }
}

module.exports = Store;
