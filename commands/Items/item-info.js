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
    const cost = currencySymbol + BigInt(item.cost).toLocaleString();
    const trimmedCost = cost.length > 1000 ? cost.slice(0, 1000) + '...' : cost;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Item Info')
      .addFields([
        { name: 'Name', value: itemKey, inline: true },
        { name: 'Cost', value: trimmedCost, inline: true },
        { name: 'Description', value: item.description, inline: false },
        { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
        { name: 'Stock Remaining', value: item.stock ? item.stock.toLocaleString() : 'Infinity', inline: true },
        {
          name: 'Role Required',
          value: item.roleRequired ? this.client.util.getRole(msg, item.roleRequired).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Given',
          value: item.roleGiven ? this.client.util.getRole(msg, item.roleGiven).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Removed',
          value: item.roleRemoved ? this.client.util.getRole(msg, item.roleRemoved).toString() : 'None',
          inline: true,
        },
        { name: 'Reply Message', value: item.replyMessage || 'None', inline: true },
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ItemInfo;
