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
      return this.client.util.errorEmbed(msg, 'That item does not exist in the store.');
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const cost = currencySymbol + BigInt(item.cost).toLocaleString();
    const requiredBalance = item.requiredBalance
      ? currencySymbol + BigInt(item.requiredBalance).toLocaleString()
      : 'None';
    const timeRemainingString = item.timeRemaining
      ? `Deleted <t:${Math.floor(item.timeRemaining / 1000)}:R>`
      : 'No time limit';

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Item Info')
      .addFields([
        { name: 'Name', value: itemKey, inline: true },
        { name: 'Cost', value: this.client.util.limitStringLength(cost, 0, 1024), inline: true },
        { name: 'Description', value: item.description, inline: false },
        { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
        { name: 'Time Remaining', value: timeRemainingString, inline: true },
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
        {
          name: 'Required Balance',
          value: this.client.util.limitStringLength(requiredBalance, 0, 1024),
          inline: true,
        },
        { name: 'Reply Message', value: item.replyMessage || 'None', inline: true },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ItemInfo;
