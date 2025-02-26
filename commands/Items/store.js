const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');

const db = new QuickDB();

class Store extends Command {
  constructor(client) {
    super(client, {
      name: 'store',
      description: 'View the items available for purchase',
      category: 'Items',
      examples: ['store [page]'],
      aliases: ['shop'],
      usage: 'store [page]',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = parseInt(args.join(' ')) || 1;

    if (isNaN(page)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    await msg.guild.members.fetch();
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Sort store by item cost
    const sortedStore = Object.entries(store).sort(([, itemInfoA], [, itemInfoB]) => itemInfoA.cost - itemInfoB.cost);

    // Construct the message with item names
    const itemDetails = sortedStore.map(([itemName, itemInfo]) => {
      const csCost = currencySymbol + BigInt(itemInfo.cost).toLocaleString();
      return {
        name: `${this.client.util.limitStringLength(csCost, 0, 100)} - ${itemName}`,
        value: `${itemInfo.description}`,
        inline: false,
      };
    });

    const maxPages = Math.ceil(itemDetails.length / 10) || 1;

    // Ensure page is within valid range
    page = Math.max(1, Math.min(page, maxPages));

    let displayedStore = itemDetails.slice((page - 1) * 10, page * 10);

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name} Store`)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .addFields(displayedStore)
      .setFooter({ text: `Page ${page} / ${maxPages}` })
      .setTimestamp();

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

    if (!itemDetails.length) {
      const errorEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} Store`)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(
          stripIndents`
          The store is empty. Someone probably robbed it :shrug:
          Add items to the store using the create-item command.`,
        )
        .setFooter({ text: `Page ${page} / ${maxPages}` });

      return await msg.channel.send({ embeds: [errorEmbed], components: [row] });
    }

    const message = await msg.channel.send({ embeds: [embed], components: [row] });
    const collector = message.createMessageComponentCollector({ time: 3600000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', ephemeral: true });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      displayedStore = itemDetails.slice((page - 1) * 10, page * 10);

      const updatedEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} Store`)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .addFields(displayedStore)
        .setFooter({ text: `Page ${page} / ${maxPages}` })
        .setTimestamp();

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
      message.edit({ components: [disabledRow] });
    });
  }
}

module.exports = Store;
