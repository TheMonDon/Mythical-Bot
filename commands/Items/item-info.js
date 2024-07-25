const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ItemInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'item-info',
      category: 'Items',
      description: 'View information about an item.',
      usage: 'item-info <item name>',
      aliases: ['iteminfo'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();
    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

    const item = store[itemKey];
    if (!item) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription('There is not an item with that name.');

      return msg.channel.send({ embeds: [embed] });
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: 'Cost', value: currencySymbol + BigInt(item.cost).toLocaleString(), inline: true }]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ItemInfo;
