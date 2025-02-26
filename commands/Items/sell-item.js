const Command = require('../../base/Command.js');
const { MessageCollector, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SellItem extends Command {
  constructor(client) {
    super(client, {
      name: 'sell-item',
      category: 'Items',
      description: 'Sell an item to another member.',
      usage: 'sell-item <member> [quantity] <item name>',
      examples: ['sell-item @User 2 pizza'],
      aliases: ['sell'],
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    // Parse the member, quantity, and item name from the arguments
    const member = await this.client.util.getMember(msg, args[0]);
    if (!member) return msg.reply('Please mention a valid member to sell the item to.');

    let quantity = 1; // Default quantity
    let itemName = args.slice(1).join(' ').toLowerCase();

    // Check if a quantity is specified and parse it
    if (!isNaN(args[1])) {
      quantity = parseInt(args[1], 10);
      if (quantity <= 0) return msg.reply('Please enter a valid quantity.');
      itemName = args.slice(2).join(' ').toLowerCase();
    }

    // Get the seller's inventory
    const sellerInventory = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`)) || [];

    // Find the item in the seller's inventory
    const itemIndex = (sellerInventory || []).findIndex((inventoryItem) => {
      // Check if inventoryItem exists and has a name property
      if (inventoryItem && inventoryItem.name) {
        return inventoryItem.name.toLowerCase() === itemName;
      }
      return false;
    });

    if (!itemIndex || itemIndex === -1 || sellerInventory[itemIndex].quantity < quantity) {
      return msg.reply('You do not have enough of this item in your inventory.');
    }
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    // Ask the seller for a price
    itemName = sellerInventory[itemIndex].name;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`What price do you want to sell ${member} ${quantity} ${itemName}${quantity > 1 ? "'s" : ''}?`);
    await msg.channel.send({ embeds: [embed] });

    const filter = (response) => response.author.id === msg.author.id;
    const collector = new MessageCollector(msg.channel, { filter, time: 120000, max: 1 });

    collector.on('collect', async (priceMsg) => {
      const price = parseInt(priceMsg.content, 10);
      if (isNaN(price) || price < 0) {
        return msg.reply('Invalid price. The sale has been canceled.');
      }

      // Check buyer's balance
      let buyerCash = BigInt(await db.get(`servers.${msg.guild.id}.users.${member.id}.economy.cash`));
      const totalCost = BigInt(price);
      if (buyerCash < totalCost) {
        const noMoneyEmbed = new EmbedBuilder().setDescription(`${member} cannot afford this.`);
        return msg.channel.send({ embeds: [noMoneyEmbed] });
      }

      // Ask the buyer for confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(
          `${msg.author} wants to sell you ${quantity} ${itemName}${
            quantity > 1 ? "'s" : ''
          } for ${currencySymbol}${price}. \nDo you accept this? (yes/no)`,
        )
        .setFooter({ text: `Deal ends in 5 minutes` });
      await msg.channel.send({ content: `${member}`, embeds: [confirmEmbed] });

      const confirmFilter = (response) => response.author.id === member.id;
      const confirmCollector = new MessageCollector(msg.channel, { filter: confirmFilter, time: 300000, max: 1 });

      confirmCollector.on('collect', async (confirmation) => {
        if (this.client.util.yes.includes(confirmation.content.toLowerCase())) {
          // Transfer money and update inventories
          buyerCash -= totalCost;
          await db.set(`servers.${msg.guild.id}.users.${member.id}.economy.cash`, buyerCash.toString());

          let sellerCash = BigInt(await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`));
          sellerCash += totalCost;
          await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, sellerCash.toString());

          // Update seller's inventory
          sellerInventory[itemIndex].quantity -= quantity;
          if (sellerInventory[itemIndex].quantity === 0) sellerInventory.splice(itemIndex, 1);
          await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`, sellerInventory);

          // Update buyer's inventory
          const buyerInventory = (await db.get(`servers.${msg.guild.id}.users.${member.id}.economy.inventory`)) || [];
          const buyerItemIndex = buyerInventory.findIndex((invItem) => invItem?.id === sellerInventory[itemIndex].id);
          if (buyerItemIndex !== -1) {
            buyerInventory[buyerItemIndex].quantity += quantity;
          } else {
            buyerInventory.push({
              id: sellerInventory[itemIndex].id,
              quantity,
              ...sellerInventory[itemIndex],
            });
          }
          await db.set(`servers.${msg.guild.id}.users.${member.id}.economy.inventory`, buyerInventory);

          // Send confirmation message
          const confirmEmbed = new EmbedBuilder()
            .setColor(msg.settings.embedColor)
            .setDescription(
              `✅ Trade Complete \n${member} has received ${quantity} ${sellerInventory[itemIndex].name}${
                quantity > 1 ? 's' : ''
              } for ${currencySymbol}${price} from ${msg.author}`,
            );
          return msg.channel.send({ embeds: [confirmEmbed] });
        } else {
          return msg.reply('The buyer declined the offer. The sale has been canceled.');
        }
      });

      confirmCollector.on('end', (collected) => {
        if (collected.size === 0) {
          const noCollectionEmbed = new EmbedBuilder()
            .setColor(msg.settings.embedErrorColor)
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setDescription(
              `Cancelled the transaction of ${quantity} ${sellerInventory[itemIndex].name}${
                quantity > 1 ? "'s" : ''
              } for ${currencySymbol}${price} between ${msg.author} and ${member}.`,
            );
          return msg.channel.send({ embeds: [noCollectionEmbed] });
        }
      });
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        const noCollectionEmbed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(
            `Cancelled the transaction of ${quantity} ${sellerInventory[itemIndex].name}${
              quantity > 1 ? "'s" : ''
            } between ${msg.author} and ${member}.`,
          );
        msg.channel.send({ embeds: [noCollectionEmbed] });
      }
    });
  }
}

module.exports = SellItem;
