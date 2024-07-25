const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class BuyItem extends Command {
  constructor(client) {
    super(client, {
      name: 'buy-item',
      category: 'Items',
      description: 'Buy an item from the store.',
      usage: 'buy-item <item>',
      examples: ['buy pizza'],
      aliases: ['buy'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();
    if (!itemName) return msg.reply('Please specify an item to buy.');

    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

    if (!itemKey) return msg.reply('That item does not exist in the store.');

    const item = store[itemKey];
    const itemCost = BigInt(item.cost);
    let userCash = BigInt(await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`));
    if (userCash < itemCost) return msg.reply('You do not have enough money to buy this item.');

    const userInventory = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`)) || [];

    // Check if the user already owns the item
    const alreadyOwned = userInventory.find((inventoryItem) => inventoryItem.name.toLowerCase() === itemName);
    if (alreadyOwned) return msg.reply('You already own this item.');

    // Add the item to the user's inventory
    userInventory.push({ name: itemKey, ...item });

    // Deduct the cost from the user's cash
    userCash = userCash - itemCost;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, userCash.toString());
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`, userInventory);

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const csCost =
      itemCost.toLocaleString().length > 700
        ? currencySymbol + itemCost.toLocaleString().slice(0, 700) + '...'
        : currencySymbol + itemCost.toLocaleString();

    const embed = new EmbedBuilder()
      .setTitle('Purchase Successful')
      .setDescription(`You have successfully bought **${itemKey}** for ${csCost}.`)
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = BuyItem;
